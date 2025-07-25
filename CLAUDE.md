# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- `npm start` - Start the bot in production mode
- `npm run dev` - Start the bot in development mode with auto-reload (using nodemon)
- `npm run deploy` - Deploy slash commands to Discord

### Docker Commands
- `docker compose build` - Build the Docker image
- `docker compose up -d` - Start the bot in a Docker container
- `docker compose down` - Stop and remove the container
- `docker compose logs` - View container logs

## Architecture Overview

This is a Discord bot built with Discord.js v14 that provides various utility and entertainment commands in Korean. The bot uses a modular architecture with clear separation of concerns:

### Core Structure
- **Entry Point**: `src/index.js` initializes the Discord client with necessary intents and loads handlers
- **Command System**: Dual support for both slash commands (`/`) and text commands (`!`) with shared logic
- **Event-Driven**: All Discord events are handled through modular event files in `src/events/`
- **Data Storage**: Static content stored in JSON files under `src/data/` (no database)

### Key Design Patterns
1. **Handler Pattern**: Commands and events are dynamically loaded through handler modules
2. **Command Structure**: Each command exports both SlashCommandBuilder data and text command properties
3. **Utility Modules**: Shared functionality abstracted into utils (formatting, random selection, logging)
4. **Configuration**: Centralized config in `config/config.json` with environment variables for secrets

### Important Implementation Details
- Commands must export both `data` (SlashCommandBuilder) and `name` properties to support dual command types
- Cooldown system implemented per-user per-command using Discord Collections
- Error handling includes user-friendly Korean error messages
- Bot responds to multiple aliases for each command (e.g., '안녕', '규리야', 'hello', 'hi')

### Deployment
- GitHub Actions workflow automatically deploys to Ubuntu server on push to main branch
- Uses Docker Compose for containerized deployment
- Environment variables must be set in GitHub Secrets for automated deployment