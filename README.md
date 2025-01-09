# Zenopsis

A Telegram bot that monitors group chat messages and provides AI-powered conversation summaries using OpenAI's LLM.

## Features

- 📝 Monitors and captures all messages in Telegram group chats
- 💾 Stores conversation history in a database
- 🤖 Generates intelligent conversation summaries using OpenAI
- 📊 Automatically posts periodic summaries back to the group chat

## Tech Stack

- [TypeScript](https://www.typescriptlang.org/) - Programming language
- [Bun.js](https://bun.sh/) - Runtime environment
- [GramIO](https://github.com/gramiojs/gramio) - Framework for Telegram Bot API
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [Instructor.js](https://instructor-ai.github.io/) - Structured OpenAI API interactions

## Prerequisites

- Bun runtime
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- OpenAI API Key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/nullptr-party/zenopsis.git
cd zenopsis
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file in the root directory:
```env
TELEGRAM_BOT_TOKEN=your_bot_token
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=sqlite:data.db
```

4. Run database migrations:
```bash
bun run db:migrate
```

5. Start the bot:
```bash
bun run start
```

## Project Structure

```
src/
├── bot/        # Telegram bot implementation
├── db/         # Database models and migrations
├── llm/        # OpenAI integration and summarization
└── types/      # TypeScript type definitions
```

## Development

```bash
# Run in development mode with hot reload
bun run dev

# Run type checking
bun run type-check

# Run linting
bun run lint

# Run tests
bun run test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [OpenAI](https://openai.com/) for providing the LLM capabilities
- [Telegram Bot API](https://core.telegram.org/bots/api) for the bot platform
- All contributors who help improve this project
