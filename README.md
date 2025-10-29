# 🧠 AI Quiz Solver Pro MAX v3.0.0

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![AI Powered](https://img.shields.io/badge/AI-Gemini%202.5-purple.svg)

> Next-generation AI-powered quiz solver with advanced question detection, multi-format support, intelligent caching, and comprehensive history tracking.

## 🎯 What's New in v3.0.0

### 🚀 Major Upgrades

#### 1. **Advanced Question Detection System**
- **Multi-format Support**: Automatically detects and handles 5 question types:
  - 📝 Multiple Choice (A/B/C/D)
  - ✓✗ True/False Questions
  - 🔗 Matching Questions
  - ✍️ Short Answer Questions
  - 📋 Fill-in-the-Blank Questions

#### 2. **Smart Platform Auto-Detection**
- Automatically detects popular quiz platforms:
  - Quizizz
  - Kahoot
  - Google Forms
  - Moodle
  - Canvas
- One-click extraction with **Auto-Detect** button

#### 3. **Intelligent Caching System**
- Saves solved questions for 7 days
- Instant answers for repeated questions
- 500 question cache limit with smart cleanup
- Reduces API calls and costs

#### 4. **Comprehensive History Tracking**
- Records all solved questions
- Search functionality
- View statistics (total solved, average confidence, today's count)
- Export/import capabilities
- Configurable history limit (default: 100 items)

#### 5. **Answer Confidence Scoring**
- AI-powered confidence rating (0-100%)
- Visual confidence badges:
  - 🟢 High (>70%)
  - 🟡 Medium (50-70%)
  - 🔴 Low (<50%)
- Better decision-making support

#### 6. **Enhanced Question Parsing**
- Multiple regex patterns for robust detection
- Handles concatenated text (common in highlights)
- Better question/answer separation
- Improved text normalization

#### 7. **Modern Premium UI/UX**
- 3 organized tabs: Solve | History | Settings
- Real-time statistics dashboard
- Question type indicators
- Smooth animations and transitions
- Responsive design for mobile
- Professional gradient themes

#### 8. **Improved Answer Detection**
- Advanced similarity algorithms (Edit Distance)
- Multiple detection patterns
- Better page element matching
- Visual highlighting with pulse animation

## 📋 Features Overview

### Core Features
- ✅ **AI-Powered Solving**: Uses Google Gemini 2.5 Flash/Pro
- ✅ **Multi-Language Support**: Vietnamese & English
- ✅ **15+ Subject Specializations**: Math, Physics, Chemistry, etc.
- ✅ **Auto-Highlight**: Automatically highlights correct answers on page
- ✅ **Batch Processing**: Handle multiple questions efficiently
- ✅ **Custom Prompts**: Create your own AI instructions

### Technical Features
- ✅ **LocalStorage Management**: Persistent configuration & history
- ✅ **Cache System**: 7-day intelligent caching
- ✅ **History Management**: Searchable question database
- ✅ **Platform Detection**: Auto-detect quiz websites
- ✅ **Confidence Scoring**: AI answer quality metrics
- ✅ **Error Handling**: Robust error management

## 🎬 How to Use

### 1. Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Click on the Tampermonkey icon → Create new script
3. Copy and paste the entire `GeminiFlashSolver.user.js` code
4. Save (Ctrl+S or Cmd+S)

### 2. Configuration
1. Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click the floating brain button (🧠) on any webpage
3. Go to **Settings** tab
4. Enter your API key
5. Select your preferred model, language, and subject
6. Click **Save Settings**

### 3. Solving Questions

#### Method 1: Auto-Detect (Recommended for supported platforms)
1. Open quiz on supported platform (Quizizz, Kahoot, Google Forms, etc.)
2. Click **Auto-Detect from Page** button
3. Question and answers will be automatically extracted
4. Click **Solve with AI**

#### Method 2: Text Selection
1. Select the question text on any webpage
2. Click **Capture from Selection**
3. Question and answers will be parsed
4. Click **Solve with AI**

#### Method 3: Manual Input
1. Paste question in the question field
2. Paste answers in format: `A. Answer 1\nB. Answer 2...`
3. Click **Solve with AI**

### 4. View Results
- Answer is displayed with confidence score
- Correct answer is highlighted on the page with pulse animation
- Full explanation provided (if enabled)
- Result is saved to history automatically

### 5. History & Statistics
- View all solved questions in **History** tab
- Search previous questions
- See statistics: total solved, average confidence, today's count
- Click history item to re-solve

## 🎨 UI Components

### Main Panel
- **Solve Tab**: Question input, answer detection, AI solving
- **History Tab**: Browse past questions, search, clear history
- **Settings Tab**: Configure API, model, language, subject

### Statistics Dashboard
- **Total Solved**: All-time question count
- **Confidence**: Average AI confidence percentage
- **Today**: Questions solved today

### Visual Indicators
- **Question Type Badges**: Shows detected question format
- **Confidence Badges**: Color-coded answer confidence
- **Status Messages**: Real-time feedback
- **Highlight Animation**: Pulsing effect on correct answer

## ⚙️ Configuration Options

```javascript
{
  apiKey: '',                    // Your Gemini API key
  model: 'gemini-2.5-flash',     // AI model (flash/pro)
  language: 'vi',                // Output language (vi/en)
  subject: 'General',            // Subject specialization
  outputMode: 'answer',          // Response format
  customPrompt: '',              // Custom AI instructions
  temperature: 0.2,              // AI creativity (0-1)
  maxTokens: 1000,               // Max response length
  autoHighlight: true,           // Auto-highlight answers
  theme: 'dark',                 // UI theme
  autoDetect: true,              // Enable auto-detection
  enableCache: true,             // Enable answer caching
  showConfidence: true,          // Show confidence scores
  enableHistory: true,           // Track question history
  maxHistoryItems: 100,          // Max history entries
  batchMode: false               // Batch processing mode
}
```

## 🔧 Advanced Usage

### Custom Prompts
Create specialized AI instructions in Settings:
```
You are a medical expert. Analyze this clinical question...
```

### Platform-Specific Selectors
The tool automatically adapts to these platforms:
- **Quizizz**: `.question-text-container`, `.option-text`
- **Kahoot**: `.question-text`, `.answer-text`
- **Google Forms**: `.freebirdFormviewerComponentsQuestionBaseTitle`
- **Moodle**: `.qtext`, `.answer`
- **Canvas**: `.question_text`, `.answer_text`

### Answer Caching
- Automatic caching of solved questions
- 7-day expiration
- 500 question limit
- Clear cache in Settings tab

## 📊 Statistics & Analytics

Track your quiz-solving performance:
- **Total Questions Solved**: Lifetime count
- **Average Confidence**: Overall AI confidence
- **Daily Metrics**: Today's solved count
- **Subject Breakdown**: Questions by subject (in history)
- **Question Types**: Distribution of question formats

## 🎯 Supported Question Formats

### 1. Multiple Choice
```
What is 2+2?
A. 3
B. 4
C. 5
D. 6
```

### 2. True/False
```
The Earth is flat.
True
False
```

### 3. Matching
```
Match the following:
1. Apple → A. Red
2. Banana → B. Yellow
```

### 4. Fill in the Blank
```
The capital of France is _____.
```

### 5. Short Answer
```
Explain the theory of relativity.
```

## 🌐 Supported Platforms

✅ **Fully Supported** (Auto-Detection)
- Quizizz
- Kahoot
- Google Forms
- Moodle
- Canvas

✅ **Partially Supported** (Manual Capture)
- Any webpage with text selection
- Custom quiz platforms
- PDF documents (via copy-paste)

## 🔒 Privacy & Security

- ✅ All data stored locally (LocalStorage)
- ✅ No external servers (except Gemini API)
- ✅ API key stored securely in browser
- ✅ No tracking or analytics
- ✅ Open source code

## 💡 Tips & Tricks

1. **Best Accuracy**: Select "Gemini 2.5 Pro" model for complex questions
2. **Fast Results**: Use "Gemini 2.5 Flash" for quick answers
3. **Better Context**: Set correct subject in Settings
4. **Save API Calls**: Enable caching for repeated questions
5. **Search History**: Use search to find similar past questions
6. **Platform Detection**: Works best on native quiz platforms
7. **Manual Override**: Can manually edit captured text before solving

## 🐛 Troubleshooting

### Issue: "API key is required" error
**Solution**: Go to Settings tab and enter valid Gemini API key

### Issue: Auto-Detect doesn't work
**Solution**: 
- Check if platform is supported
- Try manual capture instead
- Ensure question is visible on page

### Issue: Wrong answer detected
**Solution**:
- Try Gemini 2.5 Pro model for better accuracy
- Set correct subject in Settings
- Manually verify question/answer input

### Issue: Cache not working
**Solution**:
- Check "Enable Cache" in config
- Clear cache and retry
- Check browser LocalStorage limits

### Issue: History not saving
**Solution**:
- Enable "Enable History" option
- Check LocalStorage quota
- Clear old history if limit reached

## 🚀 Performance

- **Response Time**: 2-5 seconds (Flash model)
- **Accuracy**: 85-95% (depends on question complexity)
- **Cache Hit Rate**: Instant response for cached questions
- **Memory Usage**: <5MB for 100 history items
- **API Cost**: ~$0.001 per question (Flash model)

## 📈 Version History

### v3.0.0 (2025) - **MAJOR UPDATE**
- ✨ Added multi-format question detection (5 types)
- ✨ Added platform auto-detection (5 platforms)
- ✨ Added intelligent caching system
- ✨ Added comprehensive history tracking
- ✨ Added answer confidence scoring
- ✨ Complete UI/UX redesign
- ✨ Enhanced question parsing algorithms
- ✨ Better answer detection with similarity scoring
- ✨ Statistics dashboard
- ✨ Search functionality
- 🎨 Premium gradient design
- 🎨 Smooth animations and transitions
- 🐛 Fixed multiple parsing edge cases

### v2.5.0 (Previous)
- Basic AI solving
- Simple UI
- Manual input only
- No caching
- No history

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📝 License

MIT License - Free to use and modify

## 👨‍💻 Developer

Created by **htuananh**

---

## ⭐ Support

If you find this tool helpful:
- ⭐ Star the repository
- 🐛 Report bugs on GitHub
- 💡 Suggest new features
- 📣 Share with friends

---

**Disclaimer**: This tool is for educational purposes. Use responsibly and in accordance with your institution's academic integrity policies.
