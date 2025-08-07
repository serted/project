from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from binance import AsyncClient, BinanceSocketManager
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
import json
import asyncio
import logging
from logging.handlers import RotatingFileHandler
import os
from collections import defaultdict
from pydantic import BaseModel
import aioredis
import numpy as np

# Настройка логирования
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'app.log'),
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(formatter)

console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)

logger = logging.getLogger('crypto_cluster')
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# FastAPI app
app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection
redis = None

# Модели данных
class Cluster(BaseModel):
    price: float
    volume: float
    buyVolume: float
    sellVolume: float
    delta: float
    aggression: float

class CandleData(BaseModel):
    time: int  # Unix timestamp
    open: float
    high: float
    low: float
    close: float
    volume: float
    buyVolume: float
    sellVolume: float
    delta: float
    clusters: List[Cluster]

# Кэш для данных
class DataCache:
    def __init__(self):
        self.candles: Dict[str, Dict[str, List[CandleData]]] = defaultdict(lambda: defaultdict(list))
        self.last_update: Dict[str, Dict[str, datetime]] = defaultdict(lambda: defaultdict(datetime.now))
        self.active_connections: Set[WebSocket] = set()

cache = DataCache()

async def init_redis():
    """Инициализация подключения к Redis"""
    global redis
    try:
        redis = await aioredis.create_redis_pool('redis://localhost')
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        redis = None

async def get_historical_klines(client: AsyncClient, symbol: str, interval: str, limit: int = 1000) -> List[CandleData]:
    """Получение исторических свечей"""
    try:
        cache_key = f"{symbol}_{interval}"
        
        # Проверка кэша
        if cache.candles[symbol][interval] and \
           datetime.now() - cache.last_update[symbol][interval] < timedelta(minutes=5):
            logger.info(f"Returning cached data for {cache_key}")
            return cache.candles[symbol][interval]

        logger.info(f"Fetching historical data for {symbol} with interval {interval}")
        
        # Получение свечей
        klines = await client.get_klines(symbol=symbol, interval=interval, limit=limit)
        
        # Получение агрегированных сделок
        trades = await client.get_aggregate_trades(symbol=symbol, limit=500)
        trades_by_time = defaultdict(lambda: {"buyVolume": 0, "sellVolume": 0})
        
        for trade in trades:
            timestamp = trade['T'] // 1000  # миллисекунды в секунды
            is_buyer = trade['m']  # True если продажа, False если покупка
            volume = float(trade['q']) * float(trade['p'])
            
            if is_buyer:
                trades_by_time[timestamp]["sellVolume"] += volume
            else:
                trades_by_time[timestamp]["buyVolume"] += volume

        # Преобразование данных
        processed_data = []
        for k in klines:
            timestamp = k[0] // 1000
            candle_data = {
                "time": timestamp,
                "open": float(k[1]),
                "high": float(k[2]),
                "low": float(k[3]),
                "close": float(k[4]),
                "volume": float(k[5]),
                "buyVolume": trades_by_time[timestamp]["buyVolume"],
                "sellVolume": trades_by_time[timestamp]["sellVolume"],
                "delta": trades_by_time[timestamp]["buyVolume"] - trades_by_time[timestamp]["sellVolume"],
                "clusters": calculate_clusters(k, trades_by_time[timestamp])
            }
            processed_data.append(CandleData(**candle_data))

        # Обновление кэша
        cache.candles[symbol][interval] = processed_data
        cache.last_update[symbol][interval] = datetime.now()
        
        return processed_data

    except Exception as e:
        logger.error(f"Error fetching historical data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def calculate_clusters(candle_data, trades_data, num_clusters: int = 10) -> List[Cluster]:
    """Расчет кластеров для свечи"""
    try:
        high, low = float(candle_data[2]), float(candle_data[3])
        price_range = high - low
        if price_range == 0:
            return []

        cluster_size = price_range / num_clusters
        clusters = []

        for i in range(num_clusters):
            price_level = low + (i * cluster_size)
            cluster = Cluster(
                price=price_level,
                volume=trades_data["buyVolume"] + trades_data["sellVolume"],
                buyVolume=trades_data["buyVolume"] / num_clusters,
                sellVolume=trades_data["sellVolume"] / num_clusters,
                delta=trades_data["buyVolume"] - trades_data["sellVolume"],
                aggression=calculate_aggression(trades_data)
            )
            clusters.append(cluster)

        return clusters

    except Exception as e:
        logger.error(f"Error calculating clusters: {e}")
        return []

def calculate_aggression(trades_data) -> float:
    """Расчет агрессии на основе объемов покупок/продаж"""
    try:
        total_volume = trades_data["buyVolume"] + trades_data["sellVolume"]
        if total_volume == 0:
            return 0
        return (trades_data["buyVolume"] - trades_data["sellVolume"]) / total_volume
    except Exception as e:
        logger.error(f"Error calculating aggression: {e}")
        return 0

@app.on_event("startup")
async def startup_event():
    await init_redis()

@app.on_event("shutdown")
async def shutdown_event():
    if redis is not None:
        redis.close()
        await redis.wait_closed()

@app.websocket("/ws/{symbol}")
async def websocket_endpoint(websocket: WebSocket, symbol: str):
    try:
        await websocket.accept()
        logger.info(f"WebSocket connection established for symbol {symbol}")
        cache.active_connections.add(websocket)

        # Инициализация клиента Binance
        client = await AsyncClient()
        bm = BinanceSocketManager(client)

        # Отправка исторических данных
        historical_data = await get_historical_klines(client, symbol, "1m")
        await websocket.send_json({
            "type": "historical",
            "data": [d.dict() for d in historical_data]
        })
        logger.info(f"Sent historical data for {symbol}")

        # Подключение к потоку торгов
        async with bm.trade_socket(symbol) as ts:
            while True:
                try:
                    msg = await ts.recv()
                    logger.debug(f"Received trade data: {msg}")

                    # Обработка новых данных
                    trade_data = {
                        "time": msg['T'] // 1000,
                        "price": float(msg['p']),
                        "volume": float(msg['q']),
                        "isBuyerMaker": msg['m']
                    }

                    # Обновление кэша и отправка данных
                    await process_and_send_update(websocket, trade_data, symbol)

                except WebSocketDisconnect:
                    logger.warning(f"WebSocket disconnected for {symbol}")
                    cache.active_connections.remove(websocket)
                    break
                except Exception as e:
                    logger.error(f"Error in WebSocket connection: {e}")
                    continue

    except Exception as e:
        logger.error(f"WebSocket error for {symbol}: {e}")
    finally:
        cache.active_connections.remove(websocket)
        await client.close_connection()
        logger.info(f"WebSocket connection closed for {symbol}")

async def process_and_send_update(websocket: WebSocket, trade_data: dict, symbol: str):
    """Обработка и отправка обновлений клиенту"""
    try:
        # Получение текущей минуты
        current_minute = trade_data['time'] - (trade_data['time'] % 60)
        
        # Обновление данных свечи
        candle = next(
            (c for c in cache.candles[symbol]["1m"] if c.time == current_minute),
            None
        )

        if candle is None:
            # Создание новой свечи
            candle = CandleData(
                time=current_minute,
                open=trade_data['price'],
                high=trade_data['price'],
                low=trade_data['price'],
                close=trade_data['price'],
                volume=trade_data['volume'],
                buyVolume=0 if trade_data['isBuyerMaker'] else trade_data['volume'],
                sellVolume=trade_data['volume'] if trade_data['isBuyerMaker'] else 0,
                delta=0,
                clusters=[]
            )
            cache.candles[symbol]["1m"].append(candle)
        else:
            # Обновление существующей свечи
            candle.high = max(candle.high, trade_data['price'])
            candle.low = min(candle.low, trade_data['price'])
            candle.close = trade_data['price']
            candle.volume += trade_data['volume']
            
            if trade_data['isBuyerMaker']:
                candle.sellVolume += trade_data['volume']
            else:
                candle.buyVolume += trade_data['volume']
            
            candle.delta = candle.buyVolume - candle.sellVolume
            candle.clusters = calculate_clusters(
                [0, candle.open, candle.high, candle.low, candle.close, candle.volume],
                {"buyVolume": candle.buyVolume, "sellVolume": candle.sellVolume}
            )

        # Отправка обновления клиенту
        await websocket.send_json({
            "type": "update",
            "data": candle.dict()
        })

        # Кэширование в Redis
        if redis is not None:
            await redis.set(
                f"candle:{symbol}:{current_minute}",
                json.dumps(candle.dict()),
                expire=3600  # 1 час
            )

    except Exception as e:
        logger.error(f"Error processing trade update: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)