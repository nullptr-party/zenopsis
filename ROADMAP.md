# Zenopsis Development Roadmap

## MVP Phase (Core Functionality)

### Phase 1: Foundation Setup
- [x] Initialize TypeScript project with Bun
- [x] Set up project structure (/src folders)
- [x] Configure environment variables handling
- [x] Create basic bot connection using GramIO
- [x] Implement basic error handling and logging system
- [x] Add essential command handlers (/start, /help)

### Phase 2: Basic Message Monitoring
- [x] Implement basic message capture middleware
- [x] Store essential message metadata (sender, timestamp, chat_id)
- [x] Handle basic text messages:
  - [x] Pure text messages
  - [x] Text captions from media messages
  - [x] Basic message validation
  - [x] Filter out bot commands and bot messages

### Phase 3: Essential Database Integration
- [x] Set up Drizzle ORM with SQLite
- [x] Create minimal database schema for:
  - [x] Chat messages
  - [x] Group configurations
  - [x] Summary history
- [x] Create initial database migrations
- [x] Implement basic database connection
- [x] Add core CRUD operations for messages

### Phase 4: Basic OpenAI Integration
- [x] Set up OpenAI client with Instructor.js
- [x] Implement basic message batching
- [x] Create simple summary generation logic
- [x] Add basic rate limiting and token management
- [x] Implement essential error handling for API calls

### Phase 5: Basic Summary Generation
- [x] Create simple timer-based summary trigger
- [x] Implement basic message selection for summarization
- [x] Create minimal summary format
- [x] Add summary delivery to group chat
- [x] Implement manual summary trigger command
- [x] Add summary formatting options
- [x] Implement summary feedback collection

## Enhancement Phase (Post-MVP)

### Phase 6: Advanced Message Handling
- [x] Enhance message validation:
  - [x] Check for empty or whitespace-only messages
  - [x] Validate message length limits
  - [x] Enhanced bot message filtering
  - [x] Check message format and encoding
- [x] Implement message threading/conversation tracking:
  - [x] Handle explicit threading via Telegram replies
  - [x] Implement context-based thread detection (keyword + similarity)
  - [x] Time-based proximity analysis
  - [x] Text similarity matching (cosine similarity)
  - [x] Name/mention detection

### Phase 7: Enhanced Reference System
- [x] Design message reference storage schema
- [x] Complete reference implementation:
  - [x] Reply tracking
  - [x] Mention handling
  - [x] Context links (similarity-based)
  - [x] Explicit thread references
- [x] Add topic detection and tracking
- [x] Create unified threading system
- [x] Add jump-to-message functionality

### Phase 8: Advanced Summary Features
- [x] Enhance summary schema:
  - [x] Define comprehensive metadata fields
  - [x] Create message reference structure
  - [x] Design topic categorization schema
  - [x] Add participant tracking
  - [x] Add schema versioning support
  - [x] Define data integrity rules:
    - [x] Required field constraints
    - [x] Data type validations
    - [x] Field length and format checks
    - [x] Reference integrity checks
- [ ] Implement topic clustering
- [x] Add cost tracking and limitations:
  - [x] Track API token usage
  - [x] Set configurable limits
  - [x] Implement usage alerts (threshold-based)
  - [x] Create cost reports (time-based analytics)

### Phase 9: Group Management
- [x] Add group-specific settings
- [x] Implement admin-only commands
- [x] Create group-specific preferences storage
- [x] Add usage statistics
- [x] Implement group welcome messages
- [x] Add group-specific summary schedules
- [x] Implement group-specific language settings

### Phase 10: Extended Features
- [x] Add support for additional message types:
  - [x] Images and photos (with caption extraction)
  - [x] Videos
  - [x] Voice messages
  - [x] Documents
  - [x] Stickers
- [x] Implement media content analysis (caption handling)
- [x] Add conversation topic detection
- [x] Implement sentiment analysis
- [x] Add multi-language support
- [ ] Create user engagement metrics
- [x] Implement conversation search:
  - [x] Time filters
  - [x] Similarity thresholding
  - [x] Fuzzy matching

## Final Phases

### Phase 11: Testing and Documentation
- [ ] Testing Framework Priority:
  - [ ] Unit Tests:
    - [ ] Message handling and references
    - [ ] Group configuration management
    - [ ] Summary generation and costs
    - [ ] Token usage tracking
  - [ ] Integration Tests:
    - [ ] Bot command workflows
    - [ ] Group management features
    - [ ] API endpoint validation
- [ ] Documentation Needs:
  - [ ] API Reference (docs/API.md)
  - [ ] User Guide (docs/USAGE.md)
  - [ ] Deployment Guide
  - [ ] Contributing Guidelines

### Phase 12: Production Deployment
- [x] Core Operational Features:
  - [x] Health monitoring endpoint
  - [x] Request logging middleware
  - [x] Error tracking system
  - [x] Token usage monitoring
- [ ] Advanced Operations:
  - [ ] Performance metrics endpoint
  - [ ] Automated database backups
  - [ ] Alert escalation system
  - [ ] Resource usage monitoring

Production Requirements:
- [x] Basic Health Monitoring:
  - [x] Health check endpoints
  - [x] Request logging
  - [x] Token usage alerts
- [ ] Advanced Operations:
  - [ ] Performance metrics
  - [ ] Automated backups
  - [ ] Alert escalation

## Questions to Consider
1. What should be the default summary interval (e.g., 6 hours, 12 hours)?
2. What should be the minimum number of messages before generating a summary?
3. Should we skip summary generation if there's too little activity?
4. How long should we retain message references?
5. How should we handle large gaps in conversation?
6. Should we add quick commands to adjust summary intervals?
7. How should we handle rate limiting for large groups?
8. What metrics should we track for optimization?

## Next Steps
1. ~~Begin with MVP Phase 1 implementation~~ ✓
2. ~~Create test group for basic feature validation~~ ✓
3. ~~Get early feedback on summary quality~~ ✓
4. Evaluate performance and resource usage
5. Regular progress reviews and roadmap updates
6. Implement advanced summary formatting
7. Add support for multiple languages
8. Optimize token usage and costs

Note: This roadmap is a living document and will be updated as development progresses and requirements evolve. 

## Additional Features
 
