import { ChatMessage, ToolDefinition } from '@jarvis/shared';
import { LLMGenerateResponse, LLMProvider, LLMStreamChunk } from '../provider.js';

export class MockLLMProvider implements LLMProvider {
  public id = 'mock';
  public name = 'JARVIS Deterministic Mock Provider';

  public async generateResponse(
    messages: ChatMessage[],
    availableTools?: ToolDefinition[]
  ): Promise<LLMGenerateResponse> {
    const lastMsg = messages[messages.length - 1];
    let text = (lastMsg?.content || '').trim().toLowerCase();

    // STT Phonetic Normalization for engineering terms (e.g. "board plot" -> "bode plot")
    text = text
      .replace(/\b(board|body|bold|boat|both|baud|bowed|bird)\s+plot\b/g, 'bode plot')
      .replace(/\b(board|body|bold|boat|both|baud|bowed|bird)\s+diagram\b/g, 'bode plot');

    // Context-Aware Disambiguation for WhatsApp (Desktop vs Web)
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    const lastAssistantMsg = assistantMessages.length > 0 ? assistantMessages[assistantMessages.length - 1].content.toLowerCase() : '';
    const isWaitingForWhatsAppChoice = lastAssistantMsg.includes('which whatsapp would you like to open');

    if (isWaitingForWhatsAppChoice) {
      if (text.includes('desktop') || text.includes('app')) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_whatsapp_desktop_${Date.now()}`,
              name: 'desktop_automation',
              args: { category: 'app', action: 'open', query: 'whatsapp' }
            }
          ]
        };
      } else if (text.includes('web') || text.includes('browser') || text.includes('site')) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_whatsapp_web_${Date.now()}`,
              name: 'desktop_automation',
              args: { category: 'browser', action: 'open_website', query: 'https://web.whatsapp.com' }
            }
          ]
        };
      }
    }

    // WhatsApp Video Call Intent Detection (e.g., "make a video call to chotu on whatsapp", "video call chotu on whatsapp")
    if (text.includes('video call') || (text.includes('video') && text.includes('whatsapp'))) {
      const match = text.match(/(?:video call|video)\s+(?:to\s+)?([a-zA-Z0-9_\s]+?)\s*(?:on\s+whatsapp|$)/i) ||
                    text.match(/([a-zA-Z0-9_\s]+?)\s*(?:video call)/i);
      const rawContact = match ? match[1].replace(/on\s+whatsapp/i, '').replace(/make\s+a/i, '').trim() : 'chotu';
      const contact = rawContact || 'chotu';

      return {
        content: null,
        toolCalls: [
          {
            id: `call_wa_video_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'whatsapp', action: 'video_call', query: contact }
          }
        ]
      };
    }

    // WhatsApp Voice Call Intent Detection (e.g., "make a voice call to chotu on whatsapp", "call chotu on whatsapp")
    if (text.includes('voice call') || (text.includes('call') && text.includes('whatsapp'))) {
      const match = text.match(/(?:voice call|call)\s+(?:to\s+)?([a-zA-Z0-9_\s]+?)\s*(?:on\s+whatsapp|$)/i) ||
                    text.match(/([a-zA-Z0-9_\s]+?)\s*(?:voice call)/i);
      const rawContact = match ? match[1].replace(/on\s+whatsapp/i, '').replace(/make\s+a/i, '').trim() : 'chotu';
      const contact = rawContact || 'chotu';

      return {
        content: null,
        toolCalls: [
          {
            id: `call_wa_voice_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'whatsapp', action: 'voice_call', query: contact }
          }
        ]
      };
    }

    // WhatsApp Message Intent Detection (e.g., "send hi to chotu on whatsapp", "send message hello to john")
    if (text.includes('send') && (text.includes('whatsapp') || text.includes('to '))) {
      const match = text.match(/send\s+(.+?)\s+to\s+([a-zA-Z0-9_\s]+?)\s*(?:on\s+whatsapp|$)/i);
      if (match) {
        const messageText = match[1].trim();
        const contact = match[2].trim();

        return {
          content: null,
          toolCalls: [
            {
              id: `call_wa_msg_${Date.now()}`,
              name: 'desktop_automation',
              args: { category: 'whatsapp', action: 'send_message', query: `${contact}:${messageText}` }
            }
          ]
        };
      }
    }

    // Direct WhatsApp Intent Detection
    if (text === 'whatsapp' || text === 'open whatsapp' || text === 'launch whatsapp' || text.includes('open whatsapp')) {
      if (text.includes('desktop') || text.includes('app')) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_whatsapp_desktop_${Date.now()}`,
              name: 'desktop_automation',
              args: { category: 'app', action: 'open', query: 'whatsapp' }
            }
          ]
        };
      } else if (text.includes('web') || text.includes('browser') || text.includes('site')) {
        return {
          content: null,
          toolCalls: [
            {
              id: `call_whatsapp_web_${Date.now()}`,
              name: 'desktop_automation',
              args: { category: 'browser', action: 'open_website', query: 'https://web.whatsapp.com' }
            }
          ]
        };
      } else {
        return {
          content: 'Which WhatsApp would you like to open — Desktop or Web?'
        };
      }
    }

    // System Message Tool Output Synthesis

    if (lastMsg?.role === 'system' || text.startsWith('[tool')) {
      const jsonMatch = lastMsg.content.match(/Output\]:\s*(\{.*\})/s);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          const msg = parsed.message || parsed.result?.message;

          // Check for close actions / closing responses first
          if (
            parsed.capability === 'application.close' ||
            parsed.action === 'close_app' ||
            parsed.action === 'close' ||
            (msg && /close|closing|closed/i.test(msg))
          ) {
            return {
              content: msg || 'Closed calculator. Returning to JARVIS main mode.'
            };
          }

          // Check for open actions / launch responses
          if (
            parsed.capability === 'application.launch' ||
            parsed.action === 'open_app' ||
            parsed.action === 'open' ||
            parsed.app === 'calculator' ||
            parsed.applicationId === 'calculator'
          ) {
            if (parsed.applicationId === 'calculator' || parsed.app === 'calculator' || parsed.query?.includes('calc')) {
              return {
                content: 'Opening calculator. What would you like to calculate?'
              };
            }
            return {
              content: msg || `Launched ${parsed.applicationId || parsed.app || 'application'}.`
            };
          }

          // Math engine calculations
          if (parsed.type || parsed.expression) {
            return {
              content: `${msg || parsed.message} What would you like to calculate next?`
            };
          }

          // Generic tool message
          if (msg) {
            return {
              content: msg
            };
          }
        } catch {
          // Fall through
        }
      }
    }

    // Follow-up Exit Intent Rule: "ok done", "done", "close", "exit", "go to jarvis"
    if (
      text === 'ok done' ||
      text === 'done' ||
      text === 'close' ||
      text === 'exit' ||
      text === 'go to jarvis' ||
      text.includes('ok done close') ||
      text === 'close calculator'
    ) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_close_app_${Date.now()}`,
            name: 'application_close',
            args: { applicationId: 'calculator' }
          }
        ]
      };
    }

    // Tool Intent Detection Rule 1: Time Query
    if (text.includes('time') || text.includes('clock')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_time_${Date.now()}`,
            name: 'get_current_time',
            args: {}
          }
        ]
      };
    }

    // Tool Intent Detection Rule 2: Higher Mathematics & Calculator Query (Python NumPy/SymPy/SciPy/Matplotlib)
    if (
      text.startsWith('calculate') ||
      text.includes('calculate ') ||
      text.includes('integrate') ||
      text.includes('integral') ||
      text.includes('derivative') ||
      text.includes('diff ') ||
      text.includes('solve ') ||
      text.includes('matrix') ||
      text.includes('determinant') ||
      text.includes('eigenvalue') ||
      text.includes('bode') ||
      text.includes('locus') ||
      text.includes('root locus') ||
      text.includes('step response') ||
      text.includes('plot ') ||

      /[0-9]+\s*[\+\-\*\/\^]\s*[0-9]+/.test(text)
    ) {
      const match = text
        .replace(/calculate\s*/i, '')
        .replace(/what is\s*/i, '')
        .replace(/\?/g, '')
        .trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_calc_${Date.now()}`,
            name: 'calculate',
            args: { expression: match || text }
          }
        ]
      };
    }

    // Tool Intent Detection Rule 3: System Status Query
    if (text.includes('system status') || text.includes('system health') || text.includes('status')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_status_${Date.now()}`,
            name: 'get_system_status',
            args: {}
          }
        ]
      };
    }

    // Tool Intent Detection Rule 4: Test Query
    if (text.includes('test yourself') || text.includes('jarvis test') || text.includes('self test')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_test_${Date.now()}`,
            name: 'jarvis_test',
            args: { component: 'core_orchestrator_pipeline' }
          }
        ]
      };
    }

    // Tool Intent Detection Rule 5: Desktop & System Automation (Volume, App, Lock, Folders, Notes, Web)
    if (text.includes('mute volume') || text.includes('mute audio') || text === 'mute' || text === 'unmute') {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_vol_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'volume', action: 'mute' }
          }
        ]
      };
    }

    if (text.includes('volume up') || text.includes('increase volume') || text.includes('turn up volume') || text.includes('higher volume')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_vol_up_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'volume', action: 'up' }
          }
        ]
      };
    }

    if (text.includes('volume down') || text.includes('decrease volume') || text.includes('turn down volume') || text.includes('lower volume')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_vol_down_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'volume', action: 'down' }
          }
        ]
      };
    }

    if (text.includes('lock pc') || text.includes('lock computer') || text.includes('lock screen') || text.includes('lock workstation')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_sys_lock_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'system', action: 'lock' }
          }
        ]
      };
    }

    if (text.includes('show desktop') || text.includes('go to desktop') || text.includes('minimize all')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_sys_desk_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'system', action: 'show_desktop' }
          }
        ]
      };
    }

    if (text.includes('organize downloads') || text.includes('organize my downloads') || text.includes('clean downloads')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_folder_org_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'folder', action: 'organize_downloads' }
          }
        ]
      };
    }

    if (text.startsWith('take note ') || text.startsWith('note down ') || text.startsWith('write note ')) {
      const noteContent = text.replace(/^(take note|note down|write note)\s+/i, '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_note_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'folder', action: 'take_note', query: noteContent }
          }
        ]
      };
    }

    if (text.startsWith('open folder ') || text.startsWith('open downloads') || text.startsWith('open documents') || text.startsWith('open desktop')) {
      const folder = text.replace('open folder ', '').replace('open ', '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_folder_open_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'folder', action: 'open', query: folder }
          }
        ]
      };
    }

    // Phase 3 Desktop Window Controls (bring to front / focus / minimize / maximize)
    if (text.includes('bring ') || text.includes('focus ') || text.includes('to front') || text.includes('to foreground')) {
      const appQuery = text
        .replace(/bring\s*/i, '')
        .replace(/to front\s*/i, '')
        .replace(/to foreground\s*/i, '')
        .replace(/focus\s*/i, '')
        .trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_win_focus_${Date.now()}`,
            name: 'window_focus',
            args: { query: appQuery || 'calculator' }
          }
        ]
      };
    }

    if (text.startsWith('minimize ') || text.includes('minimize window')) {
      const appQuery = text.replace(/minimize\s*(window)?\s*/i, '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_win_min_${Date.now()}`,
            name: 'window_minimize',
            args: { query: appQuery || 'chrome' }
          }
        ]
      };
    }

    if (text.startsWith('maximize ') || text.includes('maximize window')) {
      const appQuery = text.replace(/maximize\s*(window)?\s*/i, '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_win_max_${Date.now()}`,
            name: 'window_maximize',
            args: { query: appQuery || 'chrome' }
          }
        ]
      };
    }

    if (text.includes('running apps') || text.includes('running applications') || text.includes('show applications') || text.includes('list applications') || text.includes('show running')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_app_list_${Date.now()}`,
            name: 'application_list',
            args: {}
          }
        ]
      };
    }

    if (text.includes('system info') || text.includes('system specs') || text.includes('hardware specs')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_sys_info_${Date.now()}`,
            name: 'system_info',
            args: {}
          }
        ]
      };
    }

    if (text.includes('system uptime') || text.includes('how long has my pc')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_sys_uptime_${Date.now()}`,
            name: 'system_uptime',
            args: {}
          }
        ]
      };
    }

    if (text.includes('jarvis project directory') || text.includes('show my project') || text.includes('project directory')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_fs_list_${Date.now()}`,
            name: 'filesystem_list',
            args: { path: "d:\\Jarvis" }
          }
        ]
      };
    }

    if (text.startsWith('read file ') || text.startsWith('read ')) {
      const filePath = text.replace(/^read\s*(file\s*)?/i, '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_fs_read_${Date.now()}`,
            name: 'filesystem_read',
            args: { path: filePath || "d:\\Jarvis\\README.md" }
          }
        ]
      };
    }

    if (text.startsWith('open app ') || text.startsWith('open chrome') || text.startsWith('open vscode') || text.startsWith('open notepad') || text.startsWith('open calculator') || text.startsWith('open task manager') || text.startsWith('open spotify') || text.startsWith('open terminal') || text.startsWith('open code') || text.startsWith('open calc')) {
      let appId: 'vscode' | 'chrome' | 'notepad' | 'calculator' | 'explorer' | 'terminal' = 'calculator';
      if (text.includes('vscode') || text.includes('code')) appId = 'vscode';
      else if (text.includes('chrome')) appId = 'chrome';
      else if (text.includes('notepad')) appId = 'notepad';
      else if (text.includes('calculator') || text.includes('calc')) appId = 'calculator';
      else if (text.includes('explorer')) appId = 'explorer';
      else if (text.includes('terminal') || text.includes('cmd')) appId = 'terminal';

      return {
        content: null,
        toolCalls: [
          {
            id: `call_app_launch_${Date.now()}`,
            name: 'application_launch',
            args: { applicationId: appId }
          }
        ]
      };
    }

    if (text.startsWith('close ') || text.startsWith('close app ')) {
      let appId: 'vscode' | 'chrome' | 'notepad' | 'calculator' | 'explorer' | 'terminal' = 'calculator';
      if (text.includes('vscode') || text.includes('code')) appId = 'vscode';
      else if (text.includes('chrome')) appId = 'chrome';
      else if (text.includes('notepad')) appId = 'notepad';
      else if (text.includes('calculator') || text.includes('calc')) appId = 'calculator';
      else if (text.includes('explorer')) appId = 'explorer';
      else if (text.includes('terminal') || text.includes('cmd')) appId = 'terminal';

      return {
        content: null,
        toolCalls: [
          {
            id: `call_app_close_${Date.now()}`,
            name: 'application_close',
            args: { applicationId: appId }
          }
        ]
      };
    }

    if (text.startsWith('google search ') || text.startsWith('search google for ')) {
      const query = text.replace('google search ', '').replace('search google for ', '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_google_search_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'browser', action: 'google_search', query }
          }
        ]
      };
    }

    if (text.startsWith('open website ') || text.startsWith('open github') || text.startsWith('open reddit') || text.startsWith('open twitter')) {
      const site = text.replace('open website ', '').replace('open ', '').trim();
      return {
        content: null,
        toolCalls: [
          {
            id: `call_site_${Date.now()}`,
            name: 'desktop_automation',
            args: { category: 'browser', action: 'open_website', query: site }
          }
        ]
      };
    }

    // Tool Intent Detection Rule 6: YouTube & Media Controls (Play, Pause, Resume, Stop, Next, Previous, Change Song)
    if (text.includes('pause song') || text.includes('pause the song') || text.includes('pause music') || text === 'pause') {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_pause_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'pause' }
          }
        ]
      };
    }

    if (text.includes('resume song') || text.includes('resume music') || text.includes('unpause') || text === 'resume') {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_resume_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'resume' }
          }
        ]
      };
    }

    if (text.includes('stop song') || text.includes('stop the song') || text.includes('stop music') || text === 'stop') {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_stop_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'stop' }
          }
        ]
      };
    }

    if (text.includes('next song') || text.includes('skip song') || text.includes('next track')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_next_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'next' }
          }
        ]
      };
    }

    if (text.includes('previous song') || text.includes('prev song') || text.includes('previous track')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_prev_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'previous' }
          }
        ]
      };
    }

    if (text.includes('full screen') || text.includes('fullscreen') || text.includes('make it full screen')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_fs_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'fullscreen' }
          }
        ]
      };
    }

    if (text.includes('cinema mode') || text.includes('theater mode') || text.includes('cinema') || text.includes('make it cinema mode')) {
      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_cinema_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'cinema' }
          }
        ]
      };
    }

    if (text.includes('youtube') || text.includes('play song') || text.includes('play music') || text.includes('play some good songs') || text.startsWith('play ') || text.startsWith('change song to')) {
      let query = text
        .replace(/^change\s*song\s*to\s*/i, '')
        .replace(/^play\s*(some\s*)?(good\s*)?songs?\s*/i, '')
        .replace(/^play\s*/i, '')
        .replace(/\s+(from|on|in)\s+youtube.*$/i, '')
        .replace(/\s+youtube.*$/i, '')
        .replace(/\s+(from|on|in)$/i, '')
        .trim();

      return {
        content: null,
        toolCalls: [
          {
            id: `call_yt_play_${Date.now()}`,
            name: 'play_youtube',
            args: { action: 'play', query: query || 'popular music songs' }
          }
        ]
      };
    }

    // Rule 6: Specific Knowledge Answers
    if (text.includes('prime minister of india') || text.includes('pm of india')) {
      return {
        content: `The Prime Minister of India is Narendra Modi.`
      };
    }

    if (text.includes('president of india')) {
      return {
        content: `The President of India is Droupadi Murmu.`
      };
    }

    if (text.includes('capital of india')) {
      return {
        content: `The capital of India is New Delhi.`
      };
    }

    if (text === 'what is india') {
      return {
        content: `India is a country in South Asia. It is the seventh-largest country by area and the most populous country in the world.`
      };
    }

    // Rule 7: General Knowledge & Web Search Queries ("what is", "who is", "tell me", "explain", "how", "why")
    if (
      text.startsWith('what') ||
      text.startsWith('who') ||
      text.startsWith('where') ||
      text.startsWith('when') ||
      text.startsWith('why') ||
      text.startsWith('how') ||
      text.startsWith('tell me') ||
      text.startsWith('explain') ||
      text.startsWith('search')
    ) {
      const cleanQuery = text
        .replace(/search\s*(for)?/i, '')
        .replace(/tell me about\s*/i, '')
        .replace(/explain\s*/i, '')
        .replace(/\?/g, '')
        .trim();

      return {
        content: null,
        toolCalls: [
          {
            id: `call_search_${Date.now()}`,
            name: 'web_search',
            args: { query: cleanQuery || text }
          }
        ]
      };
    }

    // General Conversational Response (dynamically acknowledges the user prompt)
    const originalPrompt = lastMsg?.content || 'your prompt';
    return {
      content: `I have processed your request for "${originalPrompt}".`
    };
  }

  public async streamResponse(
    messages: ChatMessage[],
    availableTools: ToolDefinition[] | undefined,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMGenerateResponse> {
    const response = await this.generateResponse(messages, availableTools);

    if (response.toolCalls && response.toolCalls.length > 0) {
      onChunk({ isFinal: true, toolCallChunk: response.toolCalls[0] });
      return response;
    }

    const text = response.content || 'System nominal.';
    const words = text.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i] + (i === words.length - 1 ? '' : ' ');
      onChunk({ contentChunk: word, isFinal: false });
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    onChunk({ isFinal: true });
    return response;
  }
}
