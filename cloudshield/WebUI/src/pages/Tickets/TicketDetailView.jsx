import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiGet, apiPatch } from '../../api/client';
import { replyToTicket } from '../../api/ticketsApi';
import { useThemeColors } from '../../hooks/useThemeColors.js';

const parseApiResponse = async (response) => {
    if (response && typeof response.json === 'function') {
        return response.json();
    }
    return response;
};

const parseUTC = (str) => {
    if (!str) return null;
    return new Date(str.endsWith('Z') ? str : str + 'Z');
};
const formatTime = (str) => {
    const d = parseUTC(str);
    if (!d) return '';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDate = (str) => {
    const d = parseUTC(str);
    if (!d) return '';
    return d.toLocaleDateString();
};

const mdStyles = `
.cs-md p { margin: 0 0 0.45em 0; }
.cs-md p:last-child { margin-bottom: 0; }
.cs-md ul, .cs-md ol { margin: 0 0 0.45em 0; padding-left: 18px; }
.cs-md li { margin-bottom: 0.2em; }
.cs-md code { background: var(--action-hover); padding: 1px 5px; border-radius: 4px; font-size: 0.83em; }
.cs-md strong { font-weight: 650; }
.cs-md-support strong { color: #90caf9; }
.cs-md-system strong { color: #ffb74d; }
.cs-textarea::-webkit-scrollbar { width: 4px; height: 4px; }
.cs-textarea::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
.cs-textarea::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 10px; }
.cs-textarea::-webkit-scrollbar-thumb:hover { background: var(--border); }
.cs-textarea::-webkit-scrollbar-corner { background: transparent; }
textarea.cs-textarea { scrollbar-width: thin; scrollbar-color: var(--border-light) transparent; }
`;

const Icon = ({ d, size = 15, style }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" style={style}>
        <path d={d} />
    </svg>
);

const Icons = {
    ArrowLeft:     "M19 12H5M12 5l-7 7 7 7",
    Send:          "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
    Bot:           "M12 2a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h1V4a2 2 0 0 1 2-2zM9 14h.01M15 14h.01M9 10h6",
    User:          "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    AlertTriangle: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
    Building2:     "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4",
    Tag:           "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01",
    Calendar:      "M3 4h18v18H3zM16 2v4M8 2v4M3 10h18",
    Lock:          "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zM7 11V7a5 5 0 0 1 10 0v4",
    Zap:           "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
    CheckCircle:   "M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3",
};

const S = {
    page: {
        height: 'calc(100vh - 100px)',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '1400px',
        margin: '0 auto',
        color: 'var(--text-primary)',
        padding: '24px 32px',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        boxSizing: 'border-box',
    },
    backBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 0',
        marginBottom: '18px',
        transition: 'color 0.2s',
        flexShrink: 0,
        fontFamily: 'inherit',
    },
    body: {
        display: 'flex',
        gap: '32px',
        flexGrow: 1,
        overflow: 'hidden',
    },
    chatCol: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 1 auto',
        overflow: 'hidden',
    },
    title: {
        fontSize: '1.55rem',
        fontWeight: 700,
        margin: '0 0 12px 0',
        lineHeight: 1.3,
    },
    descBox: {
        padding: '14px 18px',
        backgroundColor: 'var(--action-hover)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        color: 'var(--text-secondary)',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.65,
        fontSize: '0.9rem',
        marginBottom: '16px',
        flexShrink: 0,
    },
    messagesBox: {
        flexGrow: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '14px',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        backgroundColor: 'rgba(0,0,0,0.18)',
        marginBottom: '12px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border-light) transparent',
    },
    emptyState: {
        margin: 'auto',
        color: 'var(--text-tertiary)',
        fontStyle: 'italic',
        fontSize: '0.875rem',
    },
    messageRow: (isMine) => ({
        display: 'flex',
        gap: '9px',
        alignSelf: isMine ? 'flex-end' : 'flex-start',
        maxWidth: '80%',
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-start',
    }),
    avatar: (isSystem, isAi) => ({
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: isSystem
            ? 'rgba(255,183,77,0.1)'
            : isAi
            ? 'rgba(100,181,246,0.1)'
            : 'var(--action-hover)',
        border: `1px solid ${
            isSystem
                ? 'rgba(255,183,77,0.28)'
                : isAi
                ? 'rgba(100,181,246,0.22)'
                : 'var(--border)'
        }`,
        color: isSystem ? '#ffb74d' : isAi ? '#64b5f6' : 'var(--text-secondary)',
    }),
    msgMeta: (isMine) => ({
        display: 'flex',
        gap: '6px',
        alignItems: 'baseline',
        marginBottom: '3px',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
    }),
    senderName: (isSystem, isAi, isMine) => ({
        fontSize: '0.76rem',
        fontWeight: 600,
        color: isSystem ? '#ffb74d' : isAi ? '#64b5f6' : isMine ? 'var(--text-primary)' : 'var(--text-tertiary)',
    }),
    timestamp: {
        fontSize: '0.68rem',
        color: 'var(--text-tertiary)',
    },
    bubble: (isSystem, isAi, isMine) => ({
        padding: '10px 13px',
        borderRadius: '11px',
        borderTopRightRadius: isMine ? '3px' : '11px',
        borderTopLeftRadius: !isMine ? '3px' : '11px',
        backgroundColor: isSystem
            ? 'rgba(255,183,77,0.07)'
            : isAi
            ? 'rgba(100,181,246,0.05)'
            : isMine
            ? '#272727'
            : 'var(--action-hover)',
        border: `1px solid ${
            isSystem ? 'rgba(255,183,77,0.22)'
            : isAi ? 'rgba(100,181,246,0.14)'
            : 'var(--border-light)'
        }`,
        color: isSystem ? '#ffb74d' : 'var(--text-primary)',
        fontSize: '0.9rem',
        lineHeight: 1.65,
        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
    }),
    inputWrap: {
        display: 'flex',
        alignItems: 'center',
        padding: '5px 12px',
        backgroundColor: 'var(--action-hover)',
        borderRadius: '22px',
        border: '1px solid var(--border-light)',
        gap: '8px',
        transition: 'border-color 0.2s, background-color 0.2s',
    },
    textarea: {
        flex: 1,
        background: 'none',
        border: 'none',
        outline: 'none',
        color: 'var(--text-primary)',
        fontSize: '0.9rem',
        resize: 'none',
        padding: '8px 2px',
        fontFamily: 'inherit',
        lineHeight: 1.5,
        maxHeight: '96px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
    },
    sendBtn: (active) => ({
        background: 'none',
        border: 'none',
        cursor: active ? 'pointer' : 'default',
        color: active ? 'var(--text-primary)' : 'var(--text-disabled)',
        padding: '6px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.2s, background-color 0.2s',
        flexShrink: 0,
    }),
    disclaimer: {
        fontSize: '0.71rem',
        color: 'var(--text-tertiary)',
        textAlign: 'center',
        margin: '9px 0 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
    },
    closedBox: {
        textAlign: 'center',
        padding: '14px',
        border: '1px dashed var(--border)',
        borderRadius: '10px',
        color: 'var(--text-tertiary)',
        fontSize: '0.875rem',
    },
    sidebar: {
        width: '290px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '26px',
        borderLeft: '1px solid var(--border)',
        paddingLeft: '28px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
    },
    sectionLabel: {
        fontSize: '0.67rem',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '1.2px',
        color: 'var(--text-tertiary)',
        margin: '0 0 14px 0',
    },
    detailRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        marginBottom: '16px',
    },
    detailIcon: {
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        backgroundColor: 'var(--action-hover)',
        border: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: 'var(--text-secondary)',
    },
    detailLabel: {
        fontSize: '0.72rem',
        color: 'var(--text-tertiary)',
        marginBottom: '2px',
    },
    detailValue: {
        fontWeight: 600,
        fontSize: '0.855rem',
    },
    selectWrap: { marginBottom: '11px' },
    selectLabel: {
        display: 'block',
        fontSize: '0.72rem',
        color: 'var(--text-tertiary)',
        marginBottom: '5px',
    },
    select: {
        width: '100%',
        backgroundColor: 'var(--action-hover)',
        border: '1px solid var(--border-light)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        padding: '9px 32px 9px 11px',
        fontSize: '0.855rem',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='var(--text-tertiary)' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 11px center',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
    },
    escalateBtn: {
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'rgba(255,183,77,0.06)',
        border: '1px solid rgba(255,183,77,0.22)',
        borderRadius: '8px',
        color: '#ffb74d',
        fontSize: '0.855rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        marginBottom: '9px',
        transition: 'background-color 0.2s',
        fontFamily: 'inherit',
        fontWeight: 500,
    },
    closeBtn: {
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'rgba(255,77,79,0.06)',
        border: '1px solid rgba(255,77,79,0.22)',
        borderRadius: '8px',
        color: '#ff4d4f',
        fontSize: '0.855rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        transition: 'background-color 0.2s',
        fontFamily: 'inherit',
        fontWeight: 500,
    },
};

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const themeColors = useThemeColors();
    const [ticketData, setTicketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [myEmail, setMyEmail] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    useEffect(() => { scrollToBottom(); }, [ticketData?.replies?.length]);

    useEffect(() => {
        let mounted = true;
        apiGet('/users/me').then(async (response) => {
            const res = await parseApiResponse(response);
            if (mounted) setMyEmail(res?.user?.email || '');
        }).catch(err => console.error('Failed to fetch user', err));
        return () => { mounted = false; };
    }, []);

    const loadTicket = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const response = await apiGet(`/tickets/${ticketId}`);
            const data = await parseApiResponse(response);
            setTicketData(data);
        } catch (err) {
            if (!isBackground) setError(err.message || 'Failed to load ticket');
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        loadTicket();
        const poll = setInterval(() => loadTicket(true), 5000);
        return () => clearInterval(poll);
    }, [ticketId]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        setIsReplying(true);
        try {
            await replyToTicket(ticketId, replyText);
            setReplyText('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            await loadTicket(true);
            scrollToBottom();
        } catch (err) {
            alert('Failed to send reply: ' + err.message);
        } finally {
            setIsReplying(false);
        }
    };

    const handleTextareaInput = (e) => {
        setReplyText(e.target.value);
        const el = textareaRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 96) + 'px'; }
    };

    const handleUpdateTicket = async (field, value) => {
        try {
            await apiPatch(`/tickets/${ticketId}/status`, { [field]: value });
            await loadTicket(true);
        } catch (err) {
            alert(`Failed to update ${field}: ` + err.message);
        }
    };

    const isClosed = ticketData?.status === 'Closed';
    const isSuperAdmin = myEmail === 'support@cloudshield.com';

    let category = 'General';
    let cleanDescription = ticketData?.description || '';
    if (ticketData?.description) {
        const match = ticketData.description.match(/^\[Category:\s(.*?)\]\n\n/);
        if (match) {
            category = match[1];
            cleanDescription = ticketData.description.replace(/^\[Category:\s(.*?)\]\n\n/, '');
        }
    }

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '64px', color: 'var(--text-tertiary)', fontFamily: 'inherit' }}>
            Loading ticket...
        </div>
    );
    if (error) return <div style={{ padding: '32px', color: '#ff4d4f' }}>{error}</div>;
    if (!ticketData) return <div style={{ padding: '32px', color: 'var(--text-primary)' }}>Ticket not found.</div>;

    return (
        <>
            <style>{mdStyles}</style>
            <div style={S.page}>
                <button
                    style={S.backBtn}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-tertiary)'}
                    oonClick={() => navigate('/tickets')}
                >
                    <Icon d={Icons.ArrowLeft} /> Back to Helpdesk
                </button>

                <div style={S.body}>
                    <div style={S.chatCol}>
                        <h1 style={S.title}>{ticketData.title}</h1>
                        <div style={S.descBox}>{cleanDescription}</div>

                        <div style={S.messagesBox}>
                            {!ticketData.replies?.length ? (
                                <div style={S.emptyState}>Start the conversation...</div>
                            ) : (
                                ticketData.replies.map((reply) => {
                                    const isAiGenerated = reply.metadata?.ai_generated === true;
                                    const isSupport = reply.user_id === 'CloudShield Support';
                                    const isSystemMessage = reply.message.includes('[SYSTEM]');
                                    const isMine = reply.user_id === myEmail || (isSuperAdmin && isSupport && !isAiGenerated);

                                    const senderName = isSystemMessage ? 'System Alert'
                                        : isAiGenerated ? 'Cortex AI'
                                        : isMine ? 'You'
                                        : reply.user_id.split('@')[0];

                                    const avatarIconPath = isSystemMessage ? Icons.AlertTriangle
                                        : isAiGenerated ? Icons.Bot
                                        : Icons.User;

                                    const mdClass = `cs-md ${isSystemMessage ? 'cs-md-system' : isSupport ? 'cs-md-support' : ''}`;

                                    return (
                                        <div key={reply.id} style={S.messageRow(isMine)}>
                                            <div style={S.avatar(isSystemMessage, isAiGenerated)}>
                                                <Icon d={avatarIconPath} size={14} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                                <div style={S.msgMeta(isMine)}>
                                                    <span style={S.senderName(isSystemMessage, isAiGenerated, isMine)}>{senderName}</span>
                                                    <span style={S.timestamp}>{formatTime(reply.created_at)}</span>
                                                </div>
                                                <div style={S.bubble(isSystemMessage, isAiGenerated, isMine)}>
                                                    <div className={mdClass}>
                                                        <ReactMarkdown>{reply.message}</ReactMarkdown>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {!isClosed ? (
                            <>
                                <form onSubmit={handleReply}>
                                    <div
                                        style={S.inputWrap}
                                        onFocus={e => { e.currentTarget.style.borderColor = themeColors.border; e.currentTarget.style.backgroundColor = themeColors.lightOverlay; }}
                                        onBlur={e => { e.currentTarget.style.borderColor = themeColors.borderLight; e.currentTarget.style.backgroundColor = themeColors.lightOverlaySubtle; }}
                                    >
                                        <textarea
                                            ref={textareaRef}
                                            rows={1}
                                            className="cs-textarea"
                                            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                            value={replyText}
                                            onChange={handleTextareaInput}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e); } }}
                                            style={S.textarea}
                                        />
                                        <button
                                            type="submit"
                                            disabled={isReplying || !replyText.trim()}
                                            style={S.sendBtn(replyText.trim() && !isReplying)}
                                            onMouseEnter={e => { if (replyText.trim()) e.currentTarget.style.backgroundColor = themeColors.lightOverlay; }}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <Icon d={Icons.Send} size={16} />
                                        </button>
                                    </div>
                                </form>
                                <p style={S.disclaimer}>
                                    <Icon d={Icons.Lock} size={11} /> CloudShield AI processes this chat. Do not share passwords, private keys, or sensitive PII.
                                </p>
                            </>
                        ) : (
                            <div style={S.closedBox}>This ticket has been closed.</div>
                        )}
                    </div>

                    <div style={S.sidebar}>
                        <div>
                            <p style={S.sectionLabel}>Ticket Details</p>

                            <div style={S.detailRow}>
                                <div style={S.detailIcon}><Icon d={Icons.User} /></div>
                                <div>
                                    <div style={S.detailLabel}>Requester</div>
                                    <div style={S.detailValue}>{ticketData.user_id}</div>
                                </div>
                            </div>

                            {isSuperAdmin && (
                                <div style={S.detailRow}>
                                    <div style={S.detailIcon}><Icon d={Icons.Building2} /></div>
                                    <div>
                                        <div style={S.detailLabel}>Organization ID</div>
                                        <div style={{ ...S.detailValue, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                            {ticketData.org_id.substring(0, 12)}...
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={S.detailRow}>
                                <div style={S.detailIcon}><Icon d={Icons.Tag} /></div>
                                <div>
                                    <div style={S.detailLabel}>Category</div>
                                    <div style={S.detailValue}>{category}</div>
                                </div>
                            </div>

                            <div style={S.detailRow}>
                                <div style={S.detailIcon}><Icon d={Icons.Calendar} /></div>
                                <div>
                                    <div style={S.detailLabel}>Created On</div>
                                    <div style={S.detailValue}>{formatDate(ticketData.created_at)}</div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p style={S.sectionLabel}>Properties</p>

                            <div style={S.selectWrap}>
                                <label style={S.selectLabel}>Status</label>
                                <select
                                    value={ticketData.status}
                                    onChange={(e) => handleUpdateTicket('status', e.target.value)}
                                    style={S.select}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                                >
                                    <option value="Open">Open</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Closed">Closed</option>
                                </select>
                            </div>

                            <div style={S.selectWrap}>
                                <label style={S.selectLabel}>Priority</label>
                                <select
                                    value={ticketData.priority}
                                    onChange={(e) => handleUpdateTicket('priority', e.target.value)}
                                    style={S.select}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>

                            {!isClosed && !isSuperAdmin && (
                                <button
                                    style={S.escalateBtn}
                                    onClick={async () => {
                                        await replyToTicket(ticketId, '[SYSTEM] ESCALATION REQUESTED \n\nI need a human specialist to take over this ticket.');
                                        loadTicket(true);
                                        scrollToBottom();
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,183,77,0.12)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,183,77,0.06)'}
                                >
                                    <Icon d={Icons.Zap} size={14} /> Escalate to Human Agent
                                </button>
                            )}

                            {!isClosed && (
                                <button
                                    style={S.closeBtn}
                                    onClick={() => handleUpdateTicket('status', 'Closed')}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,77,79,0.12)'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,77,79,0.06)'}
                                >
                                    <Icon d={Icons.CheckCircle} size={14} /> Close Ticket
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TicketDetailView;
