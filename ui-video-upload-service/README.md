# Tally Vision - AI Image Analysis Platform

<div align="center">
  <h3>🖼️ Advanced Visual Language Model Interface</h3>
  <p>React-based web application for AI-powered image analysis using Qwen3-VL model</p>
</div>

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Screenshots](#screenshots)

---

## ✨ Features

- **🖼️ Multi-Image Upload**: Drag & drop support for up to 5 images (PNG, JPG, JPEG, WEBP)
- **📝 Custom Prompts**: Editable prompt with default template
- **🔄 Real-time Progress**: Visual progress indicator during analysis
- **📊 Multiple Output Formats**: JSON, YAML, and HTML/Markdown views
- **📋 Copy & Download**: Easy result export options
- **🕐 Request History**: Last 10 queries stored in localStorage
- **🌐 API Status Indicator**: Real-time connection monitoring
- **🎨 Modern UI**: Built with shadcn/ui components
- **🧪 Comprehensive Tests**: Vitest + React Testing Library

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------||
| **Framework** | React 18+ with TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS |
| **UI Components** | shadcn/ui (Radix UI) |
| **State Management** | Zustand |
| **HTTP Client** | Axios |
| **File Upload** | react-dropzone |
| **Markdown Rendering** | react-markdown |
| **YAML Parsing** | js-yaml |
| **Icons** | lucide-react |
| **Testing** | Vitest + React Testing Library |

---

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd tally-vision

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Configure environment variables (see below)

# 5. Start development server
npm run dev
```

---

## 🚀 Usage

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Linting
npm run lint
```

### Using the Application

1. **Upload Images**: Drag & drop images or click to select (max 5, 10MB each)
2. **Edit Prompt**: Modify the analysis prompt or use default
3. **Click Go**: Start the analysis
4. **View Results**: Switch between JSON/YAML/HTML formats
5. **Export**: Copy or download results

---

## 🏗️ Project Structure

Following **Feature Sliced Design (FSD)** architecture:

```
src/
├── entities/           # Business entities (data models)
├── features/           # Feature modules
│   └── image-analysis/
│       ├── api/        # API functions
│       ├── model/      # State management (Zustand)
│       └── ui/         # Feature-specific components
├── pages/              # Page components
├── shared/             # Shared code
│   ├── api/            # API client
│   ├── lib/            # Utilities
│   ├── types/          # TypeScript types
│   └── ui/             # Reusable UI components
├── widgets/            # Complex UI blocks
│   ├── dashboard/
│   ├── header/
│   └── sidebar/
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

### Component Hierarchy

```
App
├── Header
├── Sidebar
└── Dashboard
    ├── ImageUploader
    ├── PromptInput
    ├── ResultDisplay
    └── HistoryList
```

---

## 🔌 API Documentation

### Base URL
```
http://178.141.247.203:8001
```

### Endpoint
```
POST /v1/chat/completions
```

### Request Format

```typescript
interface ChatCompletionRequest {
  model: string;                    // "qwen3-vl"
  messages: Array<{
    role: "user" | "assistant";
    content: Array<{
      type: "text" | "image_url";
      text?: string;
      image_url?: { url: string };  // base64 data URL
    }>;  
  }>;
  max_tokens: number;               // 2048
  temperature: number;              // 0.3
}
```

### Example Request

```json
{
  "model": "qwen3-vl",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Describe this image in detail"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/png;base64,iVBORw0KGgo..."
          }
        }
      ]
    }
  ],
  "max_tokens": 2048,
  "temperature": 0.3
}
```

### Response Format

```json
{
  "choices": [
    {
      "message": {
        "content": "Analysis result text..."
      }
    }
  ]
}
```

### Headers

```http
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
VITE_API_BASE_URL=http://178.141.247.203:8001
VITE_API_KEY=your_api_key_here
VITE_API_TIMEOUT=60000
```

| Variable | Description | Default |
|----------|-------------|----------||
| `VITE_API_BASE_URL` | VL model API endpoint | `http://178.141.247.203:8001` |
| `VITE_API_KEY` | Bearer token for authentication | `3B9uK43nX` |
| `VITE_API_TIMEOUT` | Request timeout in milliseconds | `60000` |

---

## 🧪 Testing

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test -- --watch

# Coverage report
npm run test:coverage

# Specific test file
npm run test -- src/features/image-analysis/api/__tests__/analyzeImage.test.ts
```

### Test Structure

```
__tests__/
├── api/
│   ├── client.test.ts          # API client tests
│   └── analyzeImage.test.ts    # Analysis API tests
├── ui/
│   └── ImageUploader.test.tsx  # Component tests
└── Dashboard.test.tsx          # Integration tests
```

---

## 📸 Screenshots

### Main Interface
```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Tally Vision              [🟢 Connected]                │
├────────────┬────────────────────────────────────────────────┤
│            │                                               │
│  🖼️ Анализ │    ┌───────────────────────────────────┐     │
│  История   │    │  📤 Drop images here              │     │
│  ⚙️ Настройки│    │  or click to select              │     │
│  ❓ Помощь  │    └───────────────────────────────────┘     │
│            │                                               │
│            │    [Image Previews]                           │
│            │                                               │
│            │    ┌───────────────────────────────────┐     │
│            │    │  Prompt: Describe the image...    │     │
│            │    │  [Textarea]                       │     │
│            │    └───────────────────────────────────┘     │
│            │                                               │
│            │    [🔄 Clear]              [▶️ Go]            │
│            │                                               │
│            │    ┌───────────────────────────────────┐     │
│            │    │  Result: [JSON | YAML | HTML]     │     │
│            │    │  [📋 Copy] [⬇️ Download]          │     │
│            │    │  [Result content...]              │     │
│            │    └───────────────────────────────────┘     │
│            │                                               │
│            │    ┌───────────────────────────────────┐     │
│            │    │  🕐 History                       │     │
│            │    │  [Previous queries...]            │     │
│            │    └───────────────────────────────────┘     │
│            │                                               │
└────────────┴────────────────────────────────────────────────┘
```

---

## 📝 Changelog

### 1.0.0 (Current)
- Initial release
- Image upload with drag & drop
- Multi-format result display
- Request history
- API integration with Qwen3-VL

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- **Qwen3-VL** - Visual Language Model
- **shadcn/ui** - Beautiful UI components
- **Vite** - Fast build tool
- **Zustand** - State management

---

<div align="center">
  <p>Built with ❤️ using React, TypeScript, and Tailwind CSS</p>
</div>
