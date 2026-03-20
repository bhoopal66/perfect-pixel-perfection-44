import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Server,
  Shield,
  MessageSquare,
  Database,
  Trash2,
  Radio,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip';

interface TestResult {
  id: string;
  name: string;
  status: TestStatus;
  assertions: { label: string; passed: boolean | null; detail?: string }[];
  duration?: number;
}

interface TestSection {
  id: string;
  title: string;
  icon: React.ElementType;
  tests: TestResult[];
  collapsed?: boolean;
}

const DEFAULT_CONFIG = {
  baseUrl: '',
  apiKey: '',
  sessionId: 'test_qa_001',
  testPhone: '971501234567',
};

async function apiCall(
  baseUrl: string,
  apiKey: string,
  method: string,
  endpoint: string,
  data?: unknown
): Promise<{ status: number; body: unknown; raw: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(apiKey ? { 'x-api-key': apiKey } : {}),
  };

  const opts: RequestInit = { method, headers };
  if (data && method !== 'GET') opts.body = JSON.stringify(data);

  const res = await fetch(`${baseUrl}${endpoint}`, opts);
  const raw = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = raw;
  }
  return { status: res.status, body, raw };
}

async function apiCallNoAuth(
  baseUrl: string,
  method: string,
  endpoint: string
): Promise<{ status: number; body: unknown; raw: string }> {
  const res = await fetch(`${baseUrl}${endpoint}`, { method });
  const raw = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    body = raw;
  }
  return { status: res.status, body, raw };
}

function assertStatus(
  res: { status: number },
  expected: number,
  label: string
): { label: string; passed: boolean; detail?: string } {
  return {
    label,
    passed: res.status === expected,
    detail: res.status !== expected ? `Expected HTTP ${expected}, got ${res.status}` : undefined,
  };
}

function assertContains(
  raw: string,
  needle: string,
  label: string
): { label: string; passed: boolean; detail?: string } {
  return {
    label,
    passed: raw.includes(needle),
    detail: !raw.includes(needle) ? `'${needle}' not found in response` : undefined,
  };
}

function assertField(
  body: unknown,
  field: string,
  label: string
): { label: string; passed: boolean; detail?: string } {
  const has = typeof body === 'object' && body !== null && field in body;
  return { label, passed: has, detail: has ? undefined : `Field '${field}' missing` };
}

export default function QATestRunner() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [sections, setSections] = useState<TestSection[]>([]);
  const [running, setRunning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abortRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const updateSection = useCallback(
    (sectionId: string, updater: (s: TestSection) => TestSection) => {
      setSections((prev) => prev.map((s) => (s.id === sectionId ? updater(s) : s)));
    },
    []
  );

  const pushResult = useCallback(
    (sectionId: string, result: TestResult) => {
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId ? { ...s, tests: [...s.tests, result] } : s
        )
      );
    },
    []
  );

  const toggleSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  const runTests = async () => {
    abortRef.current = false;
    setRunning(true);
    setStartTime(Date.now());
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    const { baseUrl, apiKey, sessionId, testPhone } = config;

    const initialSections: TestSection[] = [
      { id: 'health', title: 'Server Health', icon: Server, tests: [] },
      { id: 'auth', title: 'Authentication', icon: Shield, tests: [] },
      { id: 'session', title: 'Session Management', icon: Radio, tests: [] },
      { id: 'messaging', title: 'Messaging', icon: MessageSquare, tests: [] },
      { id: 'conversations', title: 'Conversations & Messages', icon: Database, tests: [] },
      { id: 'errors', title: 'Error Handling', icon: AlertCircle, tests: [] },
      { id: 'cleanup', title: 'Session Cleanup', icon: Trash2, tests: [] },
    ];
    setSections(initialSections);

    const run = async (
      sectionId: string,
      testName: string,
      fn: () => Promise<{ status: TestStatus; assertions: TestResult['assertions'] }>
    ) => {
      if (abortRef.current) return;
      const t0 = performance.now();
      try {
        const { status, assertions } = await fn();
        pushResult(sectionId, {
          id: `${sectionId}-${Date.now()}`,
          name: testName,
          status,
          assertions,
          duration: Math.round(performance.now() - t0),
        });
      } catch (err: unknown) {
        pushResult(sectionId, {
          id: `${sectionId}-${Date.now()}`,
          name: testName,
          status: 'fail',
          assertions: [{ label: 'Unexpected error', passed: false, detail: String(err) }],
          duration: Math.round(performance.now() - t0),
        });
      }
    };

    // ── 1. HEALTH ──
    await run('health', 'Health endpoint responds', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/health');
      const a = [
        assertStatus(res, 200, 'Returns 200'),
        assertContains(res.raw, 'ok', "Contains 'ok'"),
        assertField(res.body, 'uptime', "Has 'uptime' field"),
        assertField(res.body, 'sessions', "Has 'sessions' field"),
      ];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('health', 'Health — no auth required', async () => {
      const res = await apiCallNoAuth(baseUrl, 'GET', '/health');
      const a = [assertStatus(res, 200, 'Works without API key')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // ── 2. AUTH ──
    await run('auth', 'Rejects missing API key', async () => {
      if (!apiKey) {
        return { status: 'skip', assertions: [{ label: 'No API key configured — skipped', passed: null }] };
      }
      const res = await apiCallNoAuth(baseUrl, 'GET', '/api/sessions');
      const a = [assertStatus(res, 401, 'Returns 401 without key')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('auth', 'Accepts valid API key', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/sessions');
      const a = [assertStatus(res, 200, 'Returns 200 with key')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // ── 3. SESSION ──
    await run('session', 'List sessions', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/sessions');
      const a = [
        assertStatus(res, 200, 'Returns 200'),
        assertField(res.body, 'sessions', "Has 'sessions' field"),
      ];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('session', 'Create new session', async () => {
      const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}`);
      const a = [
        assertStatus(res, 200, 'Returns 200'),
        assertContains(res.raw, 'sessionId', 'Contains sessionId'),
        assertContains(res.raw, sessionId, 'Contains our session ID'),
      ];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // Small delay for initialization
    await new Promise((r) => setTimeout(r, 2000));

    await run('session', 'Session appears in list', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/sessions');
      const a = [assertContains(res.raw, sessionId, `Session ${sessionId} in list`)];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('session', 'Get session status', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/sessions/${sessionId}/status`);
      const a = [
        assertStatus(res, 200, 'Returns 200'),
        assertContains(res.raw, 'status', 'Has status field'),
      ];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('session', 'Get QR code', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/sessions/${sessionId}/qr?format=image`);
      const a = [assertStatus(res, 200, 'Returns 200')];
      if (res.raw.includes('data:image')) {
        a.push({ label: 'QR returned as base64', passed: true });
      } else if (res.raw.includes('Already connected')) {
        a.push({ label: 'Already connected — no QR needed', passed: true });
      } else {
        a.push({ label: 'QR not yet available', passed: null, detail: 'Session still initializing' });
        return { status: 'skip', assertions: a };
      }
      return { status: a.every((x) => x.passed !== false) ? 'pass' : 'fail', assertions: a };
    });

    await run('session', 'Duplicate session (idempotent)', async () => {
      const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}`);
      const a = [assertStatus(res, 200, 'Returns 200 (idempotent)')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('session', 'Non-existent session returns 404', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/sessions/nonexistent_999/status');
      const a = [assertStatus(res, 404, 'Returns 404')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // ── 4. MESSAGING ──
    const statusRes = await apiCall(baseUrl, apiKey, 'GET', `/api/sessions/${sessionId}/status`);
    const sessionStatus = typeof statusRes.body === 'object' && statusRes.body !== null
      ? (statusRes.body as Record<string, unknown>).status
      : '';

    if (sessionStatus !== 'open') {
      await run('messaging', 'Messaging tests (session not connected)', async () => {
        return {
          status: 'skip',
          assertions: [{ label: `Session status is '${sessionStatus}' — scan QR first`, passed: null }],
        };
      });
    } else {
      await run('messaging', 'Send text message', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send`, {
          to: testPhone,
          text: `[QA Test] Hello - ${new Date().toLocaleTimeString()}`,
        });
        const a = [
          assertStatus(res, 200, 'Returns 200'),
          assertContains(res.raw, 'success', "Contains 'success'"),
          assertContains(res.raw, 'messageId', 'Contains messageId'),
        ];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });

      await run('messaging', 'Missing "to" field', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send`, { text: 'test' });
        const a = [assertStatus(res, 400, 'Returns 400'), assertContains(res.raw, 'error', 'Error returned')];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });

      await run('messaging', 'Missing "text" field', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send`, { to: testPhone });
        const a = [assertStatus(res, 400, 'Returns 400')];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });

      await run('messaging', 'Send template (welcome)', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send-template`, {
          to: testPhone,
          templateKey: 'welcome',
          vars: { name: 'QA Tester' },
        });
        const a = [
          assertStatus(res, 200, 'Returns 200'),
          assertContains(res.raw, 'QA Tester', 'Variables replaced'),
        ];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });

      await run('messaging', 'Invalid template key', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send-template`, {
          to: testPhone,
          templateKey: 'nonexistent_template',
          vars: {},
        });
        const a = [assertStatus(res, 400, 'Returns 400')];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });

      await run('messaging', 'Send media message', async () => {
        const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send-media`, {
          to: testPhone,
          mediaUrl: 'https://via.placeholder.com/150',
          caption: 'QA Test Image',
          mediaType: 'image',
        });
        if (res.status === 200) {
          return { status: 'pass', assertions: [{ label: 'Media send returns 200', passed: true }] };
        }
        return {
          status: 'skip',
          assertions: [{ label: `Media send returned ${res.status}`, passed: null, detail: 'External URL may be blocked' }],
        };
      });

      await run('messaging', 'Check WhatsApp number', async () => {
        const res = await apiCall(baseUrl, apiKey, 'GET', `/api/sessions/${sessionId}/check/${testPhone}`);
        const a = [
          assertStatus(res, 200, 'Returns 200'),
          assertField(res.body, 'exists', "Has 'exists' field"),
        ];
        return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
      });
    }

    // ── 5. CONVERSATIONS ──
    await run('conversations', 'List conversations', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/conversations?sessionId=${sessionId}`);
      const a = [assertStatus(res, 200, 'Returns 200'), assertField(res.body, 'conversations', "Has 'conversations'")];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('conversations', 'List all conversations', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/conversations');
      const a = [assertStatus(res, 200, 'Returns 200')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('conversations', 'Get messages for phone', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/conversations/${testPhone}/messages?sessionId=${sessionId}`);
      const a = [assertStatus(res, 200, 'Returns 200'), assertField(res.body, 'messages', "Has 'messages'")];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('conversations', 'Paginated messages', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/conversations/${testPhone}/messages?sessionId=${sessionId}&limit=5&offset=0`);
      const a = [assertStatus(res, 200, 'Returns 200')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('conversations', 'Mark conversation as read', async () => {
      const res = await apiCall(baseUrl, apiKey, 'POST', `/api/conversations/${testPhone}/read`, { sessionId });
      const a = [assertStatus(res, 200, 'Returns 200'), assertContains(res.raw, 'success', "Contains 'success'")];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // ── 6. ERRORS ──
    await run('errors', '404 for unknown route', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', '/api/nonexistent/route');
      const a = [assertStatus(res, 404, 'Returns 404')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('errors', 'Send to disconnected session', async () => {
      const res = await apiCall(baseUrl, apiKey, 'POST', '/api/sessions/disconnected_fake_999/send', {
        to: testPhone,
        text: 'test',
      });
      const a = [assertContains(res.raw, 'error', 'Error returned')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('errors', 'Empty body on send', async () => {
      const res = await apiCall(baseUrl, apiKey, 'POST', `/api/sessions/${sessionId}/send`, {});
      const a = [assertStatus(res, 400, 'Returns 400')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    // ── 7. CLEANUP ──
    await run('cleanup', 'Delete test session', async () => {
      const res = await apiCall(baseUrl, apiKey, 'DELETE', `/api/sessions/${sessionId}`);
      const a = [assertStatus(res, 200, 'Returns 200'), assertContains(res.raw, 'success', "Contains 'success'")];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('cleanup', 'Verify session removed', async () => {
      const res = await apiCall(baseUrl, apiKey, 'GET', `/api/sessions/${sessionId}/status`);
      const a = [assertStatus(res, 404, 'Returns 404')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    await run('cleanup', 'Delete non-existent session', async () => {
      const res = await apiCall(baseUrl, apiKey, 'DELETE', '/api/sessions/nonexistent_999');
      const a = [assertStatus(res, 200, 'Returns 200 (idempotent)')];
      return { status: a.every((x) => x.passed) ? 'pass' : 'fail', assertions: a };
    });

    clearInterval(timerRef.current);
    setRunning(false);
  };

  const stopTests = () => {
    abortRef.current = true;
    clearInterval(timerRef.current);
    setRunning(false);
  };

  const resetTests = () => {
    setSections([]);
    setElapsed(0);
    setStartTime(null);
  };

  // Stats
  const allTests = sections.flatMap((s) => s.tests);
  const passed = allTests.filter((t) => t.status === 'pass').length;
  const failed = allTests.filter((t) => t.status === 'fail').length;
  const skipped = allTests.filter((t) => t.status === 'skip').length;
  const total = allTests.length;

  const statusIcon = (s: TestStatus) => {
    switch (s) {
      case 'pass': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'fail': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'skip': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">WhatsApp Backend QA</h1>
        <p className="text-muted-foreground text-sm">
          Test your TaamulConnect WhatsApp backend endpoints
        </p>
      </div>

      {/* Config */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Server URL
              </label>
              <Input
                value={config.baseUrl}
                onChange={(e) => setConfig((c) => ({ ...c, baseUrl: e.target.value }))}
                placeholder="http://localhost:3001"
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                API Key
              </label>
              <Input
                value={config.apiKey}
                onChange={(e) => setConfig((c) => ({ ...c, apiKey: e.target.value }))}
                placeholder="Enter your API key"
                type="password"
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Session ID
              </label>
              <Input
                value={config.sessionId}
                onChange={(e) => setConfig((c) => ({ ...c, sessionId: e.target.value }))}
                disabled={running}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Test Phone
              </label>
              <Input
                value={config.testPhone}
                onChange={(e) => setConfig((c) => ({ ...c, testPhone: e.target.value }))}
                disabled={running}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls + Stats */}
      <div className="flex flex-wrap items-center gap-3">
        {!running ? (
          <Button onClick={runTests} className="gap-2">
            <Play className="w-4 h-4" />
            Run All Tests
          </Button>
        ) : (
          <Button onClick={stopTests} variant="destructive" className="gap-2">
            <Square className="w-4 h-4" />
            Stop
          </Button>
        )}
        <Button onClick={resetTests} variant="outline" size="icon" disabled={running}>
          <RotateCcw className="w-4 h-4" />
        </Button>

        {total > 0 && (
          <div className="flex items-center gap-3 ml-auto text-sm">
            <span className="text-muted-foreground">{elapsed}s</span>
            <Separator orientation="vertical" className="h-5" />
            <span className="font-medium">{total} total</span>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
              {passed} passed
            </Badge>
            {failed > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-200">
                {failed} failed
              </Badge>
            )}
            {skipped > 0 && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">
                {skipped} skipped
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Overall status bar */}
      {total > 0 && !running && (
        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm font-medium flex items-center gap-2',
            failed === 0
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-red-500/10 text-red-700'
          )}
        >
          {failed === 0 ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              All tests passed
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5" />
              {failed} test{failed > 1 ? 's' : ''} failed
            </>
          )}
        </div>
      )}

      {/* Results */}
      <ScrollArea className="h-[calc(100vh-480px)]">
        <div className="space-y-3">
          {sections.map((section) => {
            const sPass = section.tests.filter((t) => t.status === 'pass').length;
            const sFail = section.tests.filter((t) => t.status === 'fail').length;
            const Icon = section.icon;

            return (
              <Card key={section.id}>
                <CardHeader
                  className="py-3 px-4 cursor-pointer select-none"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center gap-3">
                    {section.collapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold flex-1">
                      {section.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {section.tests.length > 0 && (
                        <>
                          <span className="text-emerald-600">{sPass}✓</span>
                          {sFail > 0 && <span className="text-red-600">{sFail}✗</span>}
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {!section.collapsed && section.tests.length > 0 && (
                  <CardContent className="pt-0 px-4 pb-3 space-y-2">
                    {section.tests.map((test) => (
                      <div key={test.id} className="rounded-md border bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2">
                          {statusIcon(test.status)}
                          <span className="text-sm font-medium flex-1">{test.name}</span>
                          {test.duration !== undefined && (
                            <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                          )}
                        </div>
                        {test.assertions.length > 0 && (
                          <div className="mt-1.5 ml-6 space-y-0.5">
                            {test.assertions.map((a, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-xs">
                                {a.passed === true && (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                )}
                                {a.passed === false && (
                                  <XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                                )}
                                {a.passed === null && (
                                  <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                )}
                                <span className={cn(a.passed === false && 'text-red-600')}>
                                  {a.label}
                                  {a.detail && (
                                    <span className="text-muted-foreground ml-1">— {a.detail}</span>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
