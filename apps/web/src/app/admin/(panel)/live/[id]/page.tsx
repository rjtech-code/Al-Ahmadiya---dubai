'use client';

import { Camera, CameraOff, Circle, Download, Eye, FileUp, Mic, MicOff, MonitorUp, Radio, Save, Square, Users, Video } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LiveChat } from '@/components/account/LiveChat';
import { QuizBuilder, type QuizQ } from '@/components/admin/QuizBuilder';
import { adminBtn, adminBtnDanger, adminBtnOutline, adminInput, ErrorNote, PageHeader, Panel, StatusPill } from '@/components/admin/ui';
import { cn } from '@/components/ui/cn';
import { apiFetch, ApiError, uploadWithProgress } from '@/lib/client-api';
import { LiveClient, type ChatMsg, type Participant } from '@/lib/live-client';

interface S { id: string; titleEn: string; titleAr: string; scheduledAt: string; startedAt: string | null; status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED'; recordingStatus: 'NONE' | 'DRAFT' | 'PUBLISHED'; recordingKey: string | null; course: { titleEn: string; slug: string }; lesson: { id: string } | null }
interface Att { userId: string; name: string; email: string; firstJoinedAt: string | null; lastLeftAt: string | null; joinCount: number; minutes: number; percent: number; status: 'PRESENT' | 'LATE' | 'PARTIAL' | 'ABSENT'; onlineNow: boolean }
interface AttMeta { classMinutes: number; presentPercent: number; lateAfterMin: number; enrolled: number; present: number; late: number; partial: number; absent: number }

const time = (d: string | null) => (d ? new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—');
const TONE: Record<Att['status'], string> = { PRESENT: 'bg-emerald-50 text-success', LATE: 'bg-amber-50 text-warning', PARTIAL: 'bg-orange-50 text-orange-700', ABSENT: 'bg-red-50 text-danger' };

/**
 * Teacher console on our own media server (no third-party tool):
 * camera / screen + mic broadcast, live viewer count, who has joined, comments, automatic attendance,
 * in-browser recording, then Save as draft / Download / Upload & publish.
 */
export default function LiveConsole() {
  const { id } = useParams<{ id: string }>();
  const [s, setS] = useState<S | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [connected, setConnected] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [att, setAtt] = useState<{ rows: Att[]; meta: AttMeta } | null>(null);
  const [tab, setTab] = useState<'joined' | 'attendance'>('joined');
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [post, setPost] = useState({ titleEn: '', titleAr: '', descriptionEn: '', notesEn: '', notesAr: '' });
  const [quiz, setQuiz] = useState<QuizQ[]>([]);

  const preview = useRef<HTMLVideoElement>(null);
  const client = useRef<LiveClient | null>(null);
  const cam = useRef<MediaStream | null>(null);
  const screen = useRef<MediaStream | null>(null);
  const rec = useRef<{ mr: MediaRecorder; timer: number } | null>(null);

  const apply = useCallback((d: S) => { setS(d); setPost((p) => (p.titleEn ? p : { ...p, titleEn: d.titleEn, titleAr: d.titleAr })); }, []);
  const load = useCallback(() => apiFetch<{ data: S }>(`/admin/live/sessions/${id}`).then((r) => apply(r.data)), [id, apply]);
  const loadAtt = useCallback(() => apiFetch<{ data: Att[]; meta: AttMeta }>(`/admin/live/sessions/${id}/attendance`).then((r) => setAtt({ rows: r.data, meta: r.meta })), [id]);

  useEffect(() => {
    let x = false;
    apiFetch<{ data: S }>(`/admin/live/sessions/${id}`).then((r) => { if (!x) apply(r.data); }).catch((e: unknown) => { if (!x) setError(e instanceof ApiError ? e.message : 'Failed'); });
    return () => { x = true; };
  }, [id, apply]);

  // Attendance refreshes every 10 s during the class
  useEffect(() => {
    if (!s || s.status === 'SCHEDULED') return;
    let x = false;
    const tick = () => apiFetch<{ data: Att[]; meta: AttMeta }>(`/admin/live/sessions/${id}/attendance`).then((r) => { if (!x) setAtt({ rows: r.data, meta: r.meta }); }).catch(() => undefined);
    void tick();
    const t = s.status === 'LIVE' ? window.setInterval(tick, 10_000) : undefined;
    return () => { x = true; if (t) window.clearInterval(t); };
  }, [s, id]);

  // Refresh attendance the moment someone joins or leaves (in addition to the 10 s timer).
  useEffect(() => {
    if (s?.status !== 'LIVE') return;
    let x = false;
    apiFetch<{ data: Att[]; meta: AttMeta }>(`/admin/live/sessions/${id}/attendance`).then((r) => { if (!x) setAtt({ rows: r.data, meta: r.meta }); }).catch(() => undefined);
    return () => { x = true; };
  }, [participants, s?.status, id]);

  const showLocal = (st: MediaStream) => { if (preview.current) { preview.current.srcObject = st; void preview.current.play().catch(() => undefined); } };

  /** Connect as host and start broadcasting camera + mic. */
  const broadcast = useCallback(async () => {
    setError('');
    try {
      const c = new LiveClient(id, {
        onChat: (m) => setChat((x) => [...x, m]),
        onChatDeleted: (cid) => setChat((x) => x.filter((m) => m.id !== cid)),
        onPresence: setViewers,
        onParticipants: setParticipants,
        onDisconnect: () => setConnected(false),
      });
      const info = await c.connect();
      client.current = c;
      setChat(info.chat); setViewers(info.viewers); setParticipants(info.participants ?? []);
      cam.current = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: { echoCancellation: true, noiseSuppression: true } });
      showLocal(cam.current);
      for (const t of cam.current.getTracks()) await c.publish(t);
      setConnected(true);
    } catch (e) {
      setError(e instanceof Error ? (e.name === 'NotAllowedError' ? 'Camera/microphone permission was denied.' : e.message) : 'Could not start the broadcast');
    }
  }, [id]);

  useEffect(() => () => { client.current?.close(); cam.current?.getTracks().forEach((t) => t.stop()); screen.current?.getTracks().forEach((t) => t.stop()); }, []);
  useEffect(() => { if (s?.status === 'LIVE' && !client.current) void broadcast(); }, [s?.status, broadcast]);

  const goLive = async () => {
    try { await apiFetch(`/admin/live/sessions/${id}/start`, { method: 'POST' }); await load(); setMsg('You are live. All enrolled students have been notified.'); } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const toggleCam = () => { const v = !camOn; setCamOn(v); cam.current?.getVideoTracks().forEach((t) => (t.enabled = v)); if (!sharing) client.current?.setPaused('video', !v); };
  const toggleMic = () => { const v = !micOn; setMicOn(v); cam.current?.getAudioTracks().forEach((t) => (t.enabled = v)); client.current?.setPaused('audio', !v); };
  const toggleScreen = async () => {
    const c = client.current;
    if (!c || !cam.current) return;
    if (sharing) {
      screen.current?.getTracks().forEach((t) => t.stop()); screen.current = null;
      await c.publish(cam.current.getVideoTracks()[0]); showLocal(cam.current); setSharing(false);
      return;
    }
    try {
      screen.current = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: false });
      const track = screen.current.getVideoTracks()[0];
      track.addEventListener('ended', () => { void (async () => { if (cam.current) { await c.publish(cam.current.getVideoTracks()[0]); showLocal(cam.current); } setSharing(false); })(); });
      await c.publish(track); showLocal(screen.current); setSharing(true);
    } catch { /* user cancelled screen picker */ }
  };

  /** Records exactly what students see (camera or screen, switching seamlessly) + the microphone. */
  const startRecording = () => {
    const v = preview.current;
    if (!v || !cam.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1280; canvas.height = 720;
    const ctx = canvas.getContext('2d')!;
    const timer = window.setInterval(() => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (v.videoWidth) { const r = Math.min(canvas.width / v.videoWidth, canvas.height / v.videoHeight); const w = v.videoWidth * r, h = v.videoHeight * r; ctx.drawImage(v, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); }
    }, 1000 / 25);
    const out = new MediaStream([...canvas.captureStream(25).getVideoTracks(), ...cam.current.getAudioTracks().map((t) => t.clone())]);
    const mr = new MediaRecorder(out, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus' : 'video/webm' });
    const chunks: Blob[] = [];
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => { window.clearInterval(timer); out.getTracks().forEach((t) => t.stop()); setBlob(new Blob(chunks, { type: 'video/webm' })); setRecording(false); };
    mr.start(1000);
    rec.current = { mr, timer };
    setRecording(true); setBlob(null);
  };
  const stopRecording = () => { if (rec.current && rec.current.mr.state !== 'inactive') rec.current.mr.stop(); };

  const endClass = async () => {
    if (!window.confirm('End the class for everyone?')) return;
    stopRecording();
    try {
      await apiFetch(`/admin/live/sessions/${id}/end`, { method: 'POST' });
      client.current?.close(); client.current = null;
      cam.current?.getTracks().forEach((t) => t.stop()); screen.current?.getTracks().forEach((t) => t.stop());
      setAtt(null); setConnected(false); await load(); await loadAtt(); setTab('attendance');
      window.setTimeout(() => void loadAtt(), 1500); // pick up the final leave times written as connections close
      setMsg('Class ended. Attendance is saved. Choose what to do with the recording below.');
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };

  const download = async () => {
    if (blob) { const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = `${s?.titleEn ?? 'class'}.webm`; a.click(); URL.revokeObjectURL(u); return; }
    try { window.location.href = (await apiFetch<{ data: { url: string } }>(`/admin/live/sessions/${id}/recording-url`)).data.url; } catch (e) { setError(e instanceof ApiError ? e.message : 'Failed'); }
  };
  const upload = async (action: 'draft' | 'publish', file?: File) => {
    setError('');
    const fd = new FormData();
    fd.append('action', action);
    Object.entries(post).forEach(([k, v]) => v && fd.append(k, v));
    if (quiz.length) fd.append('quiz', JSON.stringify(quiz));
    const vfile = file ?? (blob ? new File([blob], 'recording.webm', { type: 'video/webm' }) : null);
    try {
      if (vfile) { setPct(0); fd.append('video', vfile); await uploadWithProgress(`/admin/live/sessions/${id}/recording`, fd, setPct); }
      else if (action === 'publish') await apiFetch(`/admin/live/sessions/${id}/publish`, { method: 'POST', json: { ...post, quiz: quiz.length ? JSON.stringify(quiz) : undefined } });
      await load(); setBlob(null);
      setMsg(action === 'draft' ? 'Recording saved as a private draft.' : 'Recording published as a lecture. Students have been notified.');
    } catch (e) { setError(e instanceof ApiError ? `${e.message}${Array.isArray(e.body.details) ? ` — ${(e.body.details as { message: string }[]).map((d) => d.message).join('; ')}` : ''}` : 'Upload failed'); } finally { setPct(null); }
  };
  const exportCsv = () => {
    if (!att) return;
    const lines = [['Name', 'Email', 'Status', 'First joined', 'Last left', 'Minutes', '% of class', 'Joins'], ...att.rows.map((r) => [r.name, r.email, r.status, r.firstJoinedAt ?? '', r.lastLeftAt ?? '', r.minutes, r.percent, r.joinCount])];
    const u = URL.createObjectURL(new Blob([lines.map((l) => l.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = u; a.download = `attendance-${s?.titleEn ?? id}.csv`; a.click(); URL.revokeObjectURL(u);
  };

  if (!s) return <><ErrorNote message={error} /><p className="text-sm text-muted">Loading…</p></>;
  const hasRecording = !!blob || !!s.recordingKey;
  return (
    <>
      <PageHeader title={s.titleEn} crumbs={[{ label: 'Live classes', href: '/admin/live' }, { label: s.titleEn }]} description={`${s.course.titleEn} · ${new Date(s.scheduledAt).toLocaleString('en-GB')}`}
        actions={<div className="flex items-center gap-2">{s.status === 'LIVE' && <span className="inline-flex items-center gap-1 rounded-full bg-brand-900 px-3 py-1 text-xs font-semibold text-white"><Eye className="size-3.5" />{viewers} watching</span>}<StatusPill status={s.status} /><StatusPill status={`REC ${s.recordingStatus}`} /></div>} />
      <ErrorNote message={error} />
      {msg && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-success">{msg}</p>}

      {s.status === 'SCHEDULED' && (
        <Panel title="Ready to start">
          <p className="mb-4 text-sm text-muted">Going live notifies every enrolled student. The class runs on the university’s own server; students join from their account and their attendance is recorded automatically.</p>
          <div className="flex gap-2"><button onClick={() => void goLive()} className={adminBtnDanger}><Radio className="size-4" />Go live & notify students</button><button onClick={async () => { await apiFetch(`/admin/live/sessions/${id}/cancel`, { method: 'POST' }); await load(); }} className={adminBtnOutline}>Cancel class</button></div>
        </Panel>
      )}

      {s.status === 'LIVE' && (
        <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-black">
              <video ref={preview} autoPlay playsInline muted className="aspect-video w-full" />
              <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-danger px-3 py-1 text-xs font-semibold text-white"><span className="size-2 animate-pulse rounded-full bg-white" />LIVE{recording && ' · REC'}</span>
              {!connected && <button onClick={() => void broadcast()} className="absolute inset-0 grid place-items-center bg-black/60 text-white">Reconnect broadcast</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={toggleMic} className={micOn ? adminBtnOutline : adminBtnDanger}>{micOn ? <Mic className="size-4" /> : <MicOff className="size-4" />}{micOn ? 'Mute' : 'Unmute'}</button>
              <button onClick={toggleCam} className={camOn ? adminBtnOutline : adminBtnDanger}>{camOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}{camOn ? 'Camera off' : 'Camera on'}</button>
              <button onClick={() => void toggleScreen()} className={sharing ? adminBtn : adminBtnOutline}><MonitorUp className="size-4" />{sharing ? 'Stop sharing' : 'Share screen'}</button>
              {!recording ? <button onClick={startRecording} disabled={!connected} className={adminBtnOutline}><Circle className="size-4 fill-danger text-danger" />Start recording</button> : <button onClick={stopRecording} className={adminBtnOutline}><Square className="size-4" />Stop recording</button>}
              <button onClick={() => void endClass()} className={`${adminBtn} ms-auto`}><Square className="size-4" />End class</button>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <section className="rounded-[1.5rem] border border-white/80 bg-cream-50 shadow-[var(--shadow-card)]">
              <div className="flex gap-1 border-b border-line p-2">
                <button onClick={() => setTab('joined')} className={cn('flex-1 rounded-full py-1.5 text-xs font-semibold', tab === 'joined' ? 'bg-brand-900 text-white' : 'text-brand-900')}><Users className="me-1 inline size-3.5" />In class ({participants.length})</button>
                <button onClick={() => setTab('attendance')} className={cn('flex-1 rounded-full py-1.5 text-xs font-semibold', tab === 'attendance' ? 'bg-brand-900 text-white' : 'text-brand-900')}>Attendance</button>
              </div>
              {tab === 'joined' ? (
                <ul className="max-h-64 overflow-y-auto p-3 text-sm">
                  {participants.length === 0 && <li className="text-muted">No students have joined yet.</li>}
                  {participants.map((p) => <li key={p.userId} className="flex items-center justify-between border-b border-line py-1.5 last:border-0"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-success" />{p.name}</span><span className="text-xs text-muted">joined {time(p.joinedAt)}</span></li>)}
                </ul>
              ) : <AttendanceMini att={att} />}
            </section>
            <div className="h-[26rem]"><LiveChat messages={chat} onSend={async (b) => { await client.current?.chat(b); }} onDelete={(cid) => void client.current?.deleteChat(cid)} labels={{ title: 'Comments', placeholder: 'Reply to students…', send: 'Send', teacher: 'Teacher', you: 'You' }} /></div>
          </div>
        </div>
      )}

      {s.status === 'ENDED' && att && (
        <Panel title={`Attendance — ${att.meta.present + att.meta.late} present of ${att.meta.enrolled} enrolled`} className="mb-4" actions={<button onClick={exportCsv} className={adminBtnOutline}><Download className="size-4" />CSV</button>}>
          <AttendanceTable att={att} />
        </Panel>
      )}

      {(s.status === 'ENDED' || blob) && s.recordingStatus !== 'PUBLISHED' && (
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="After the class — recording">
            {blob && <video src={URL.createObjectURL(blob)} controls className="mb-3 aspect-video w-full rounded-2xl bg-black" />}
            {!hasRecording && (
              <label className="block rounded-2xl border-2 border-dashed border-gold-300 p-4 text-center text-sm"><Video className="mx-auto size-6 text-gold-600" />Upload a recording file (MP4/WebM)
                <input type="file" accept="video/mp4,video/webm,video/quicktime" className="sr-only" onChange={(e) => e.target.files?.[0] && void upload('draft', e.target.files[0])} /></label>
            )}
            {pct !== null && <div className="my-3 h-2 overflow-hidden rounded-full bg-cream-200"><div className="h-full bg-brand-900" style={{ width: `${pct}%` }} /></div>}
            {hasRecording && (
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void upload('draft')} disabled={pct !== null || (!blob && s.recordingStatus === 'DRAFT')} className={adminBtnOutline}><Save className="size-4" />Save as draft</button>
                <button onClick={() => void download()} className={adminBtnOutline}><Download className="size-4" />Download</button>
                <button onClick={() => void upload('publish')} disabled={pct !== null} className={adminBtn}><FileUp className="size-4" />Upload & publish</button>
              </div>
            )}
            {s.recordingStatus === 'DRAFT' && !blob && <p className="mt-3 text-xs text-muted">A draft recording is stored privately. Publish it when ready.</p>}
          </Panel>
          <Panel title="Lecture details, extra notes & quiz (used when publishing)">
            <div className="space-y-3">
              <input className={adminInput} placeholder="Lecture title (English)" value={post.titleEn} onChange={(e) => setPost({ ...post, titleEn: e.target.value })} />
              <input dir="rtl" className={adminInput} placeholder="عنوان المحاضرة (عربي)" value={post.titleAr} onChange={(e) => setPost({ ...post, titleAr: e.target.value })} />
              <textarea rows={2} className={`${adminInput} h-auto py-2`} placeholder="Description" value={post.descriptionEn} onChange={(e) => setPost({ ...post, descriptionEn: e.target.value })} />
              <textarea rows={4} className={`${adminInput} h-auto py-2`} placeholder="Extra notes for students (English, optional)" value={post.notesEn} onChange={(e) => setPost({ ...post, notesEn: e.target.value })} />
              <textarea rows={4} dir="rtl" className={`${adminInput} h-auto py-2`} placeholder="ملاحظات إضافية (عربي، اختياري)" value={post.notesAr} onChange={(e) => setPost({ ...post, notesAr: e.target.value })} />
              <p className="text-xs font-semibold">Quiz (optional)</p>
              <QuizBuilder questions={quiz} onChange={setQuiz} />
            </div>
          </Panel>
        </div>
      )}
      {s.recordingStatus === 'PUBLISHED' && <Panel title="Recording published"><p className="text-sm">This class is now a lecture in <a className="underline" href={`/en/courses/${s.course.slug}`} target="_blank" rel="noreferrer">{s.course.titleEn}</a>. Students have been notified.</p></Panel>}
    </>
  );
}

function AttendanceMini({ att }: { att: { rows: Att[]; meta: AttMeta } | null }) {
  if (!att) return <p className="p-3 text-sm text-muted">Loading…</p>;
  return (
    <div className="p-3 text-sm">
      <p className="mb-2 text-xs text-muted">Present ≥ {att.meta.presentPercent}% of the class · late after {att.meta.lateAfterMin} min · updates every 10 s</p>
      <div className="mb-2 grid grid-cols-4 gap-1 text-center text-xs">
        {(['present', 'late', 'partial', 'absent'] as const).map((k) => <div key={k} className="rounded-xl bg-cream-200 py-1"><p className="font-display text-xl font-semibold text-brand-900">{att.meta[k]}</p><p className="capitalize text-muted">{k}</p></div>)}
      </div>
      <ul className="max-h-48 overflow-y-auto">{att.rows.map((r) => <li key={r.userId} className="flex items-center justify-between border-b border-line py-1 last:border-0"><span>{r.onlineNow && <span className="me-1 inline-block size-2 rounded-full bg-success" />}{r.name}</span><span className={cn('rounded-full px-2 text-[11px] font-semibold', TONE[r.status])}>{r.status} · {r.minutes}m</span></li>)}</ul>
    </div>
  );
}

function AttendanceTable({ att }: { att: { rows: Att[]; meta: AttMeta } }) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-muted">Class length {att.meta.classMinutes} min · Present ≥ {att.meta.presentPercent}% · Late after {att.meta.lateAfterMin} min · {att.meta.present} present, {att.meta.late} late, {att.meta.partial} partial, {att.meta.absent} absent</p>
      <table className="w-full min-w-[640px] text-sm">
        <thead className="text-xs uppercase text-muted"><tr><th className="py-2 text-start">Student</th><th className="text-start">Status</th><th className="text-start">First joined</th><th className="text-start">Last left</th><th className="text-start">Minutes</th><th className="text-start">% of class</th><th className="text-start">Joins</th></tr></thead>
        <tbody className="divide-y divide-line">
          {att.rows.map((r) => (
            <tr key={r.userId}>
              <td className="py-2">{r.name}<span className="block text-xs text-muted">{r.email}</span></td>
              <td><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', TONE[r.status])}>{r.status}</span></td>
              <td className="text-xs">{time(r.firstJoinedAt)}</td><td className="text-xs">{time(r.lastLeftAt)}</td>
              <td>{r.minutes}</td><td>{r.percent}%</td><td>{r.joinCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
