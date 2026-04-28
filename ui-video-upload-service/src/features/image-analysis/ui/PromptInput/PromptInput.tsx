import { useState } from 'react';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { MessageSquare } from 'lucide-react';

const DEFAULT_PROMPT = `Ты — экспертный аналитик UI/UX и фронтенд-архитектор.

У тебя есть несколько изображений сайтов, которые мне нравятся. Твоя задача — провести ДЕТАЛЬНЫЙ сравнительный анализ и на его основе сформулировать ТЗ для создания нового сайта.

Проанализируй строго по следующей схеме:

1. Для КАЖДОГО сайта (по очереди) перечисли:
   - Общая компоновка (сетка: сколько колонок, есть ли сайдбар, где навигация)
   - Типографика (приблизительные размеры шрифтов, контраст, гарнитуры — serif/sans)
   - Цветовая палитра (основной, акцентный, фоновый)
   - Расстояния и отступы (плотно/воздушно)
   - Акценты и визуальная иерархия (что привлекает взгляд первым)
   - Особенности интерактива (карточки, кнопки, ховеры, анимация — что заметно статически)
   - Настроение и стиль (минимализм, дерзкий, корпоративный, organic, glassmorphism и т.п.)

2. Затем НАЛОЖИ общие паттерны (что повторяется во всех сайтах) и уникальные фишки каждого.

3. В конце выдай ОДИН структурированный список требований к новому сайту, который объединит лучшее из всех примеров. Раздели на:
   - Layout (сетка, отступы, позиционирование ключевых блоков)
   - Typography & Color
   - Components (карточки, кнопки, формы, навигация)
   - Mood & Micro-interactions

Важно: 
- Пиши конкретно, без воды. 
- Если чего-то не видно на скриншоте — пропускай. 
- Результат должен быть пригоден для передачи другой LLM-генератору кода (например, чтобы она сделала HTML/CSS).`

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, disabled = false }: PromptInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const useDefault = () => {
    setLocalValue(DEFAULT_PROMPT);
    onChange(DEFAULT_PROMPT);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">
            Промт для анализа
          </Label>
        </div>
        {localValue !== DEFAULT_PROMPT && (
          <button
            onClick={useDefault}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Восстановить дефолтный
          </button>
        )}
      </div>
      <Textarea
        value={localValue}
        onChange={handleChange}
        placeholder="Введите описание того, что нужно найти на изображении..."
        disabled={disabled}
        className="min-h-[100px] resize-none"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{localValue.length} символов</span>
        <span>Используйте естественный язык</span>
      </div>
    </div>
  );
}
