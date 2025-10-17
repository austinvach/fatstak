# Bitcoin Wallet Tracker Design Document

## Overview

The Bitcoin Wallet Tracker is a client-side single-page web application that enables users to monitor multiple Bitcoin wallet addresses and their USD values in real-time. The application will use modern web technologies including HTML5, CSS3, and vanilla JavaScript, with integration to free Bitcoin APIs for address balance and price data.

## Architecture

### System Architecture
- **Frontend**: Single-page web application (SPA) using vanilla JavaScript
- **Data Storage**: Browser localStorage for persistence
- **External APIs**: 
  - Blockchain.info API for wallet balance data
  - CoinGecko API for Bitcoin price data
- **Update Mechanism**: Automatic refresh every 60 seconds using JavaScript intervals

### Technology Stack
- HTML5 for structure
- CSS3 (with Tailwind CSS for styling based on existing project setup)
- Vanilla JavaScript for functionality
- Fetch API for HTTP requests
- localStorage for data persistence

## Components and Interfaces

### 1. Wallet Input Component
**Purpose**: Handle wallet address input and validation
- Input field for Bitcoin addresses
- Add button to submit addresses
- Client-side validation for Bitcoin address format
- Error display for invalid addresses

### 2. Wallet List Component  
**Purpose**: Display tracked wallets with their values
- List container for wallet items
- Individual wallet cards showing:
  - Bitcoin address (truncated for display)
  - Bitcoin balance
  - USD value
  - Remove button
- Loading states during API calls

### 3. Portfolio Summary Component
**Purpose**: Show total portfolio value
- Total value display in USD
- Last updated timestamp
- Refresh button for manual updates

### 4. Data Manager Module
**Purpose**: Handle API calls and data management
- Bitcoin address validation functions
- API integration for balance fetching
- Price data retrieval
- localStorage operations
- Error handling for API failures

## Data Models

### Wallet Object
```javascript
{
  address: string,        // Bitcoin wallet address
  balance: number,        // Balance in BTC
  usdValue: number,       // Current USD value
  lastUpdated: timestamp  // Last update time
}
```

### Portfolio State
```javascript
{
  wallets: Wallet[],      // Array of tracked wallets
  totalValue: number,     // Total USD value
  btcPrice: number,       // Current BTC/USD price
  lastUpdated: timestamp, // Last portfolio update
  isLoading: boolean      // Loading state flag
}
```

## API Integration

### Blockchain.info API
- **Endpoint**: `https://blockchain.info/q/addressbalance/{address}`
- **Purpose**: Get Bitcoin balance for specific addresses
- **Rate Limits**: No authentication required, reasonable rate limits
- **Response**: Balance in satoshis (divide by 100,000,000 for BTC)

### CoinGecko API  
- **Endpoint**: `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`
- **Purpose**: Get current Bitcoin price in USD
- **Rate Limits**: Free tier allows sufficient requests
- **Response**: JSON with current BTC price

### Error Handling Strategy
- Network failures: Display user-friendly error messages
- Invalid addresses: Client-side validation with immediate feedback
- API rate limits: Implement exponential backoff
- Partial failures: Continue showing available data, mark failed items

## User Interface Design

### Layout Structure
1. **Header Section**
   - Application title
   - Total portfolio value (prominent display)
   - Last updated indicator

2. **Input Section**
   - Bitcoin address input field
   - Add wallet button
   - Validation error messages

3. **Wallet List Section**
   - Grid/list of wallet cards
   - Each card shows address, balance, USD value, remove button
   - Loading spinners during updates
   - Empty state message when no wallets tracked

4. **Footer Section**
   - Auto-refresh status
   - Manual refresh button

### Responsive Design
- Mobile-first approach using Tailwind CSS
- Responsive grid for wallet cards
- Touch-friendly buttons and inputs
- Optimized for both desktop and mobile viewing

## Error Handling

### Input Validation Errors
- Invalid Bitcoin address format
- Duplicate address prevention
- Empty input handling

### API Communication Errors
- Network connectivity issues
- API service unavailability  
- Rate limiting responses
- Invalid API responses

### Data Persistence Errors
- localStorage quota exceeded
- localStorage unavailable
- Corrupted stored data recovery

## Testing Strategy

### Unit Testing Focus Areas
- Bitcoin address validation functions
- USD value calculations
- localStorage operations
- API response parsing

### Integration Testing
- End-to-end wallet addition flow
- Portfolio value calculation accuracy
- Auto-refresh functionality
- Error state handling

### Manual Testing Scenarios
- Add valid/invalid Bitcoin addresses
- Remove wallets and verify total updates
- Test with network disconnection
- Verify localStorage persistence across sessions
- Test responsive design on different screen sizes

## Performance Considerations

### Optimization Strategies
- Batch API calls where possible
- Implement caching for Bitcoin price data (5-minute cache)
- Debounce user input validation
- Lazy loading for large wallet lists
- Minimize DOM manipulations during updates

### Scalability Limits
- Client-side application suitable for personal use (10-50 wallets)
- API rate limits may restrict frequent updates with many wallets
- localStorage size limits for wallet data storage

## Security Considerations

### Data Privacy
- No wallet private keys handled or stored
- Only public Bitcoin addresses tracked
- All data stored locally in browser
- No server-side data transmission

### API Security
- Use HTTPS endpoints only
- Implement request timeout limits
- Validate all API responses before processing
- No sensitive data in API requests