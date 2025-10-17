# globe🌏

A locally deployable MongoDB administration and navigation tool designed for environments where you only have SSH access to the server and need to host MongoDB management tools through the internet.

## Features

- **Dashboard**: Overview of database health, recent queries, and quick stats
- **Database Explorer**: Browse databases and collections with detailed information
- **Query Builder**: Schema-driven dynamic query interface with live preview
- **Aggregation Builder**: JSON editor and visual pipeline builder for MongoDB aggregations
- **Schema Management**: Upload and manage collection schemas for dynamic form generation
- **Real-time Monitoring**: Live charts and metrics for memory, connections, operations, and indexes
- **Settings**: Connection configuration, authentication, and UI preferences

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB instance accessible via connection string

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory, ready to be deployed to your server.

## Configuration

### Connection Settings

Configure your MongoDB connection in the Settings page:

- **Connection String**: Your MongoDB connection URI
- **Authentication**: Enable if your MongoDB requires authentication
- **Default Database**: Set the default database to connect to

### UI Preferences

- **Dark Mode**: Toggle between light and dark themes
- **Auto Refresh**: Enable automatic data refreshing
- **Refresh Interval**: Set how often to refresh data
- **Max Results**: Limit the number of results per query

## Architecture

### Layout Components

- **Sidebar**: Navigation between different sections
- **Topbar**: Search, connection status, and quick actions
- **Main Content**: Dynamic content area based on selected navigation

### Pages

1. **Dashboard**: Quick overview and recent activities
2. **Databases**: Database listing and management
3. **Collections**: Collection browser and document viewer
4. **Query Builder**: Visual query construction with schema awareness
5. **Aggregations**: Pipeline builder for complex queries
6. **Schema Upload**: Upload and manage JSON schemas
7. **Stats & Monitoring**: Real-time performance metrics
8. **Settings**: Application configuration

### Technology Stack

- **Frontend**: React 19, Vite
- **Styling**: Tailwind CSS
- **Icons**: Heroicons, Lucide React
- **Routing**: React Router
- **Charts**: Recharts
- **Forms**: React Hook Form

## Features in Detail

### Schema-Driven Query Builder

Upload JSON schemas to automatically generate dynamic forms:

```json
{
  "users": {
    "type": "object",
    "properties": {
      "name": { "type": "string", "required": true },
      "email": { "type": "string", "format": "email" },
      "age": { "type": "number", "minimum": 0 },
      "status": { 
        "type": "string", 
        "enum": ["active", "inactive", "pending"] 
      }
    }
  }
}
```

### Real-time Monitoring

- Operations per second charts
- Memory usage tracking
- Active connections by database
- Live data updates every 5 seconds (configurable)

### Export Capabilities

- Export query results to CSV/JSON
- Save frequently used queries
- Export database schemas

## Deployment

This tool is designed to be deployed on servers with SSH access:

1. Build the project: `npm run build`
2. Upload the `dist` folder to your server
3. Serve the static files using any web server (nginx, Apache, etc.)
4. Configure MongoDB connection through the UI

## Security Considerations

- This tool is designed for internal use and should not be exposed to the public internet without proper authentication
- Always use secure MongoDB connection strings
- Consider using environment variables for sensitive configuration

## Development

### Project Structure

```
src/
├── components/
│   ├── layout/          # Layout components (Sidebar, Topbar, Layout)
│   └── ui/              # Reusable UI components (Card, Button)
├── pages/               # Page components for each route
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
└── store/               # State management
```

### Adding New Features

1. Create page components in `src/pages/`
2. Add routes in `src/App.jsx`
3. Add navigation items in `src/components/layout/Sidebar.jsx`
4. Use existing UI components from `src/components/ui/`

## License

MIT License - feel free to use and modify for your needs.

## Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
