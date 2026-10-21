import {
  AlertCircle,
  Check,
  CornerDownLeft,
  LoaderCircle,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useAuthedSession } from '@/hooks/useSession';
import { assistantService } from '@/services/assistantService';
import { ui } from '@/styles/tokens';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/datetime';
import type { PendingAction, ToolActionExecution } from '@/schemas/assistant';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: ToolActionExecution[];
  pendingAction?: PendingAction | null;
}

const SUGGESTED_PROMPTS = [
  'What care tasks are due today?',
  'When is the next appointment?',
  'Show the upcoming medication reminders.',
  'Summarize recent care updates.',
] as const;

export function AssistantPage() {
  const { user, circle } = useAuthedSession();
  const toast = useToast();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: assistantService.sendMessage,
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      const assistantMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString(),
        actions: data.actions,
        pendingAction: data.needsConfirmation ? data.pendingAction : null,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    },
    onError: () => {
      const errorMsg: ChatMessage = {
        id: `msg_err_${Date.now()}`,
        sender: 'assistant',
        text: 'The CareCircle assistant service is currently unreachable or offline. Please check your connection or try again shortly.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    },
  });

  const confirmActionMutation = useMutation({
    mutationFn: assistantService.confirmAction,
    onSuccess: (data, variables) => {
      toast.show(variables.confirmed ? 'action_confirmed' : 'action_cancelled');
      const followupMsg: ChatMessage = {
        id: `msg_asst_${Date.now()}`,
        sender: 'assistant',
        text: data.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, followupMsg]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const trimmed = (textToSend ?? input).trim();
    if (!trimmed || sendMutation.isPending) return;

    const userMsg: ChatMessage = {
      id: `msg_usr_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    sendMutation.mutate({
      message: trimmed,
      conversationId: conversationId || undefined,
      patientId: circle?.id,
      caregiverId: user.id,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Browser Web Speech Recognition fallback for Voice
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceNotice(
        'Voice speech recognition is not supported in this browser. Please type your message.',
      );
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognition as any)();
      recognition.lang = user.timeZone?.includes('Kolkata') ? 'en-IN' : 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsRecording(true);
        setVoiceNotice('Listening... speak now.');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
          setVoiceNotice(null);
          handleSend(transcript);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setVoiceNotice('Microphone access was denied or speech could not be recognized.');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch {
      setIsRecording(false);
      setVoiceNotice('Could not initialize microphone. Please check permissions.');
    }
  };

  const handleSpeakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[36rem] flex-col space-y-4">
      <PageHeader
        title="Care Assistant"
        description="Conversational coordination for daily care, medication reminders, and schedule updates."
      />

      {/* Safety Notice Banner */}
      <div className="flex items-start gap-2.5 rounded-2xl border border-line bg-navy-50/70 px-4 py-2.5 text-xs text-ink-muted">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-navy-700" />
        <p>
          CareCircle Assistant is an elderly-care coordination companion. It does not provide
          medical diagnoses, prescriptions, or replace licensed healthcare practitioners.
        </p>
      </div>

      {/* Conversation Area */}
      <div
        aria-label="Conversation history"
        className="flex-1 space-y-4 overflow-y-auto rounded-bubble border border-line bg-paper p-4 shadow-soft md:p-6"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ai-100 text-ai-700">
              <Sparkles aria-hidden="true" className="h-8 w-8" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold">
              How can I assist your care routine?
            </h2>
            <p className="mt-1 max-w-md text-base text-ink-soft">
              Ask about scheduled tasks, next visits, medication doses, or summarize recent updates.
            </p>

            <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="rounded-full border border-ai-300 bg-ai-50 px-4 py-2 text-sm font-bold text-ai-700 hover:bg-ai-100 transition-colors"
                >
                  &ldquo;{prompt}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex flex-col', msg.sender === 'user' ? 'items-end' : 'items-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-3xl px-5 py-3.5 text-base md:max-w-[70%]',
                  msg.sender === 'user'
                    ? 'rounded-br-sm bg-navy-900 text-paper'
                    : 'rounded-bl-sm border-2 border-dashed border-ai-300 bg-ai-50 text-ink',
                )}
              >
                {msg.sender === 'assistant' && (
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className={ui.aiBadge}>
                      <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
                      CareCircle AI
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSpeakText(msg.text)}
                      aria-label="Read response aloud"
                      className="rounded-full p-1 text-ai-700 hover:bg-ai-100"
                    >
                      <Volume2 aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                {/* Executed Tools info */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-ai-300/60 pt-2 text-xs text-ai-700">
                    {msg.actions.map((act, i) => (
                      <div key={i} className="flex items-center gap-1.5 font-medium">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>
                          Action: {act.tool.replace('_', ' ')} ({act.status})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Confirmation Panel */}
                {msg.pendingAction && (
                  <div className="mt-4 rounded-2xl border border-warning-border bg-warning-bg p-3 text-warning-fg">
                    <p className="text-sm font-bold">Confirmation Required</p>
                    <p className="mt-1 text-xs">{msg.pendingAction.description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="md"
                        variant="primary"
                        loading={confirmActionMutation.isPending}
                        onClick={() =>
                          confirmActionMutation.mutate({
                            actionId: msg.pendingAction!.actionId,
                            confirmed: true,
                            conversationId,
                          })
                        }
                      >
                        <Check aria-hidden="true" className="h-4 w-4" />
                        <span>Confirm</span>
                      </Button>
                      <Button
                        size="md"
                        variant="secondary"
                        disabled={confirmActionMutation.isPending}
                        onClick={() =>
                          confirmActionMutation.mutate({
                            actionId: msg.pendingAction!.actionId,
                            confirmed: false,
                            conversationId,
                          })
                        }
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        <span>Cancel</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <span className="mt-1 px-2 text-xs text-ink-muted">
                <time dateTime={msg.timestamp}>{formatTime(msg.timestamp, user.timeZone)}</time>
              </span>
            </div>
          ))
        )}

        {sendMutation.isPending && (
          <div className="flex items-center gap-3 text-sm font-bold text-ai-700">
            <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
            <span>Processing request…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Voice notice if applicable */}
      {voiceNotice && (
        <div className="flex items-center justify-between rounded-xl bg-warning-bg px-4 py-2 text-sm text-warning-fg">
          <span>{voiceNotice}</span>
          <button type="button" onClick={() => setVoiceNotice(null)} className="p-1 font-bold">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Message Composer */}
      <div className="relative rounded-2xl border-2 border-line bg-paper p-2 focus-within:border-navy-700">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or request a care reminder (Press Enter to send)…"
          rows={2}
          className="w-full resize-none bg-transparent px-3 py-2 text-base text-ink placeholder:text-ink-muted focus:outline-none"
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleToggleVoice}
            aria-label={isRecording ? 'Stop listening' : 'Start voice input'}
            className={cn(
              'inline-flex min-h-10 min-w-10 items-center justify-center rounded-full transition-colors',
              isRecording
                ? 'bg-danger-fg text-paper animate-pulse'
                : 'text-navy-800 hover:bg-navy-50',
            )}
          >
            {isRecording ? (
              <MicOff aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Mic aria-hidden="true" className="h-5 w-5" />
            )}
          </button>

          <Button
            size="md"
            variant="primary"
            disabled={!input.trim() || sendMutation.isPending}
            loading={sendMutation.isPending}
            onClick={() => handleSend()}
          >
            <span>Send</span>
            <CornerDownLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
