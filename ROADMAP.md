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
  - [ ] Check message format and encoding
- [ ] Implement message threading/conversation tracking:
  - [ ] Handle explicit threading via Telegram replies
  - [ ] Implement context-based thread detection
  - [ ] Time-based proximity analysis
  - [ ] Text similarity matching
  - [ ] Name/mention detection

### Phase 7: Enhanced Reference System
- [ ] Design message reference storage schema
- [ ] Implement message linking functionality
- [ ] Add topic detection and tracking
- [ ] Create unified threading system
- [ ] Add jump-to-message functionality

### Phase 8: Advanced Summary Features
- [x] Enhance summary schema:
  - [x] Define comprehensive metadata fields
  - [x] Create message reference structure
  - [x] Design topic categorization schema
  - [x] Add participant tracking
  - [ ] Add schema versioning support
  - [ ] Define data integrity rules:
    - [ ] Required field constraints
    - [ ] Data type validations
    - [ ] Field length and format checks
    - [ ] Reference integrity checks
- [ ] Implement topic clustering
- [ ] Add cost tracking and limitations:
  - [x] Track API token usage
  - [ ] Set configurable limits
  - [ ] Implement usage alerts
  - [ ] Create cost reports

### Phase 9: Group Management
- [x] Add group-specific settings
- [x] Implement admin-only commands
- [x] Create group-specific preferences storage
- [ ] Add usage statistics
- [ ] Implement group welcome messages
- [ ] Add group-specific summary schedules
- [ ] Implement group-specific language settings

### Phase 10: Extended Features
- [ ] Add support for additional message types:
  - [ ] Images and photos
  - [ ] Videos
  - [ ] Voice messages
  - [ ] Documents
  - [ ] Stickers
- [ ] Implement media content analysis
- [ ] Add conversation topic detection
- [ ] Implement sentiment analysis
- [ ] Add multi-language support
- [ ] Create user engagement metrics
- [ ] Implement conversation search

## Final Phases

### Phase 11: Testing and Documentation
- [ ] Write unit tests for core functionality
- [ ] Add integration tests
- [ ] Create API documentation
- [ ] Write user guide and bot commands list
- [ ] Document deployment process
- [ ] Create contributing guidelines

### Phase 12: Production Deployment
- [ ] Set up production environment
- [ ] Implement health checks
- [ ] Add performance monitoring
- [ ] Set up automated backups
- [ ] Create deployment scripts
- [ ] Implement logging and alerting
- [ ] Add system status notifications

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
 
