# Overview

This is a cryptocurrency trading application that provides real-time market data visualization with advanced cluster analysis for BTC/USDT trading pairs. The system combines a React frontend with an Express backend to deliver comprehensive trading charts featuring candlestick data, volume profiles, order books, and cluster-based market analysis similar to professional trading platforms like TradingView and ClusterBTC.

# User Preferences

Preferred communication style: Simple, everyday language in Russian.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Shadcn/UI components with Radix UI primitives for consistent, accessible interface elements
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Charts**: Combination of D3.js for custom visualizations and Lightweight Charts for candlestick rendering
- **State Management**: React Query for server state management and local React state for UI interactions
- **Real-time Updates**: WebSocket connections for live market data streaming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Real-time Communication**: WebSocket server implementation for streaming trading data
- **Data Processing**: Custom cluster calculation algorithms for market microstructure analysis
- **API Integration**: Binance WebSocket API for live market data feeds
- **Session Management**: PostgreSQL-based session storage using connect-pg-simple

## Database Layer
- **Primary Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Connection**: Neon Database serverless PostgreSQL for cloud hosting
- **Schema**: Structured tables for user management, trading data storage, and session management
- **Migrations**: Drizzle-kit for database schema versioning and migrations

## Real-time Data Processing
- **Market Data**: Live candlestick data with volume analysis and price clustering
- **Order Book**: Real-time bid/ask data with depth visualization
- **Volume Profile**: Historical volume distribution analysis across price levels
- **Cluster Analysis**: Custom algorithms to identify market microstructure patterns and liquidity zones

## Component Architecture
- **TradingChart**: Main chart container managing zoom, pan, and crosshair interactions
- **CandlestickChart**: Canvas-based OHLC rendering with performance optimizations
- **ClusterOverlay**: SVG-based cluster visualization showing volume and delta at price levels
- **VolumeProfile**: Historical volume distribution displayed as horizontal bars
- **VolumeHistogram**: Per-candle volume breakdown with buy/sell ratios
- **OrderBook**: Live bid/ask display with price alignment to chart levels

## Authentication & Security
- **Session-based Authentication**: Traditional session management with PostgreSQL storage
- **Type Safety**: Comprehensive TypeScript coverage with Zod schema validation
- **API Validation**: Request/response validation using shared schema types

# External Dependencies

## Trading Data Sources
- **Binance API**: Primary cryptocurrency exchange API for market data
- **WebSocket Streams**: Real-time price feeds and order book updates
- **Historical Data**: Candlestick and volume data for chart initialization

## Database & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with migration support
- **PostgreSQL**: Relational database for user data and trading history storage

## UI & Visualization Libraries
- **Shadcn/UI**: Pre-built React components with Radix UI accessibility features
- **D3.js**: Custom chart visualizations and data manipulation
- **Lightweight Charts**: High-performance candlestick and financial chart rendering
- **Tailwind CSS**: Utility-first CSS framework with custom design system

## Development & Build Tools
- **Vite**: Fast development server and optimized production builds
- **React Query**: Server state management with caching and synchronization
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast JavaScript bundling for server-side code