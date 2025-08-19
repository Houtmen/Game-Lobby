# Game Lobby Platform - Copilot Instructions

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview

This is a comprehensive web-based game lobby platform designed for multiplayer retro games like Heroes of Might and Magic 2. The platform enables players to connect, create game sessions, and play together through virtual networking.

## Technology Stack

- **Frontend**: Next.js 15 with TypeScript, React, Tailwind CSS
- **Backend**: Node.js with Express API routes, Socket.io for real-time communication
- **Database**: PostgreSQL for user management, game sessions, and lobby data
- **Real-time**: Socket.io for live lobby updates and player communication
- **VPN**: WireGuard integration for game networking
- **Authentication**: JWT-based authentication system

## Key Features to Implement

1. **User Authentication & Management**
   - Registration and login system
   - User profiles and game libraries
   - Friend systems and invitations

2. **Game Library Management**
   - Support for multiple retro games
   - Game detection and configuration
   - Extensible game addition system

3. **Lobby System**
   - Real-time lobby creation and joining
   - Player matchmaking
   - Game session management

4. **VPN Integration**
   - Automatic VPN network creation for game sessions
   - WireGuard configuration management
   - Network isolation per game session

5. **Game Launcher**
   - Automatic game launching with network configuration
   - Process monitoring and cleanup
   - Cross-platform compatibility

## Code Style Guidelines

- Use TypeScript strict mode
- Follow React best practices with hooks and functional components
- Implement proper error handling and loading states
- Use Tailwind CSS for styling with component-based approach
- Create reusable components and custom hooks
- Implement proper API error handling and validation
- Use Socket.io for real-time features efficiently

## Security Considerations

- Implement proper input validation and sanitization
- Use secure authentication practices
- Protect API endpoints with proper authorization
- Handle VPN credentials securely
- Implement rate limiting for API calls

## Architecture Patterns

- Use Next.js App Router for file-based routing
- Implement API routes for backend functionality
- Create custom hooks for state management
- Use TypeScript interfaces for type safety
- Implement proper separation of concerns
