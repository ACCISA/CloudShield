import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Chip, Paper, CircularProgress, 
    IconButton, Avatar, InputAdornment, Select, MenuItem, 
    FormControl, InputLabel, InputBase
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CategoryIcon from '@mui/icons-material/Category';
import BusinessIcon from '@mui/icons-material/Business';
import { apiGet, apiPatch } from '../../api/client';
import { replyToTicket } from '../../api/ticketsApi';

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const navigate = useNavigate();
    const [ticketData, setTicketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [myEmail, setMyEmail] = useState("");
    
    const messagesEndRef = useRef(null);
    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

    useEffect(() => { scrollToBottom(); }, [ticketData?.replies]);

    useEffect(() => {
        let mounted = true;
        apiGet('/users/me').then(res => {
            if (mounted) setMyEmail(res.user?.email || "");
        }).catch(err => console.error("Failed to fetch user", err));
        return () => { mounted = false; };
    }, []);

    const loadTicket = async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const data = await apiGet(`/tickets/${ticketId}`);
            setTicketData(data);
        } catch (err) {
            if (!isBackground) setError(err.message || "Failed to load ticket");
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        loadTicket();
        const pollInterval = setInterval(() => { loadTicket(true); }, 5000);
        return () => clearInterval(pollInterval);
    }, [ticketId]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        
        setIsReplying(true);
        try {
            await replyToTicket(ticketId, replyText);
            setReplyText('');
            await loadTicket(true);
            scrollToBottom();
        } catch (err) {
            alert("Failed to send reply: " + err.message);
        } finally {
            setIsReplying(false);
        }
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
    const isSuperAdmin = myEmail === "support@cloudshield.com";

    // --- SMART PARSER: Extract Category from Description ---
    let category = "General";
    let cleanDescription = ticketData?.description || "";
    if (ticketData?.description) {
        const match = ticketData.description.match(/^\[Category:\s(.*?)\]\n\n/);
        if (match) {
            category = match[1];
            cleanDescription = ticketData.description.replace(/^\[Category:\s(.*?)\]\n\n/, '');
        }
    }

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress sx={{ color: '#fff' }} /></Box>;
    if (error) return <Box sx={{ p: 4, color: '#ff4d4f' }}>{error}</Box>;
    if (!ticketData) return <Box sx={{ p: 4, color: '#fff' }}>Ticket not found.</Box>;

    // --- FIXED FLUID STYLES (Color Corrected) ---
    const selectSx = {
        color: '#fff',
        borderRadius: '8px',
        transition: 'all 0.2s ease-in-out',
        '& .MuiOutlinedInput-notchedOutline': { 
            borderColor: 'rgba(255,255,255,0.1)',
            transition: 'border-color 0.2s ease-in-out',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
        '& .MuiSvgIcon-root': { color: 'rgba(255,255,255,0.5)', transition: 'color 0.2s' },
        '&.Mui-focused .MuiSvgIcon-root': { color: '#fff' }
    };

    return (
        <Box sx={{ 
            height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', 
            maxWidth: '1400px', mx: 'auto', color: '#fff', p: { xs: 2, md: 4 }
        }}>
            {/* Top Bar: Back Button */}
            <Box sx={{ mb: 2, flexShrink: 0 }}>
                <Button 
                    startIcon={<ArrowBackIcon />} 
                    onClick={() => navigate('/tickets')}
                    sx={{ 
                        color: 'rgba(255,255,255,0.6)', textTransform: 'none', 
                        transition: 'color 0.2s', '&:hover': { color: '#fff', backgroundColor: 'transparent' } 
                    }}
                >
                    Back to Helpdesk
                </Button>
            </Box>

            {/* TWO-COLUMN LAYOUT CONTAINER */}
            <Box sx={{ display: 'flex', gap: 4, flexGrow: 1, overflow: 'hidden' }}>
                
                {/* LEFT COLUMN: THE CHAT INTERFACE */}
                <Box sx={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', overflow: 'hidden' }}>
                    
                    {/* Header */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1.5 }}>
                            {ticketData.title}
                        </Typography>
                        <Paper sx={{ 
                            p: 3, backgroundColor: 'rgba(255,255,255,0.02)', 
                            border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' 
                        }}>
                            <Typography sx={{ color: 'rgba(255,255,255,0.85)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {cleanDescription}
                            </Typography>
                        </Paper>
                    </Box>

                    {/* Chat History */}
                    <Box sx={{ 
                        flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', 
                        gap: 2, p: 2, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px',
                        backgroundColor: 'rgba(0,0,0,0.2)', mb: 2,
                        '&::-webkit-scrollbar': { width: '6px' },
                        '&::-webkit-scrollbar-track': { background: 'transparent' },
                        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.15)', borderRadius: '10px' }
                    }}>
                        {ticketData.replies?.length === 0 ? (
                            <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Start the conversation...</Typography>
                            </Box>
                        ) : (
                            ticketData.replies?.map((reply) => {
                                const isMine = reply.user_id === myEmail || (isSuperAdmin && reply.user_id === "CloudShield Support");
                                const isSupport = reply.user_id === "CloudShield Support";

                                return (
                                    <Box key={reply.id} sx={{ 
                                        display: 'flex', gap: 2, alignSelf: isMine ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%', flexDirection: isMine ? 'row-reverse' : 'row'
                                    }}>
                                        <Avatar sx={{ 
                                            // Changed from glowing green/purple to professional greys
                                            bgcolor: isSupport ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                                            color: isSupport ? '#fff' : 'rgba(255,255,255,0.7)',
                                            width: 36, height: 36,
                                            border: `1px solid ${isSupport ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                                        }}>
                                            {isSupport ? <SupportAgentIcon fontSize="small"/> : <PersonIcon fontSize="small"/>}
                                        </Avatar>

                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline', mb: 0.5 }}>
                                                {/* Text color changed to white */}
                                                <Typography sx={{ fontSize: '0.8rem', color: isMine ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                                                    {isMine ? 'You' : reply.user_id.split('@')[0]}
                                                </Typography>
                                                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>
                                                    {new Date(reply.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                            </Box>
                                            
                                            <Paper sx={{ 
                                                p: 2, 
                                                // Replaced the purple with a sleek dark grey matching the designer's theme
                                                backgroundColor: isMine ? '#2a2a2a' : 'rgba(255,255,255,0.03)', 
                                                color: '#fff', borderRadius: '12px', 
                                                borderTopRightRadius: isMine ? '4px' : '12px',
                                                borderTopLeftRadius: !isMine ? '4px' : '12px',
                                                border: isMine ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.08)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }}>
                                                <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, fontSize: '0.95rem' }}>{reply.message}</Typography>
                                            </Paper>
                                        </Box>
                                    </Box>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </Box>

                    {/* NEW SLEEK CHAT INPUT */}
                    <Box sx={{ flexShrink: 0 }}>
                        {!isClosed ? (
                            <form onSubmit={handleReply}>
                                <Paper sx={{ 
                                    display: 'flex', alignItems: 'center', p: '4px 12px',
                                    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:focus-within': {
                                        borderColor: '#888', // Removed neon green focus
                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                        boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.05)'
                                    }
                                }}>
                                    <InputBase
                                        fullWidth
                                        multiline
                                        maxRows={4}
                                        placeholder="Type a message... (Press Enter to send)"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => { 
                                            if (e.key === 'Enter' && !e.shiftKey) { 
                                                e.preventDefault(); handleReply(e); 
                                            } 
                                        }}
                                        sx={{ color: '#fff', ml: 1, fontSize: '0.95rem', py: 1.5 }}
                                    />
                                    <IconButton 
                                        type="submit" 
                                        disabled={isReplying || !replyText.trim()}
                                        sx={{ 
                                            // Changed from glowing green to crisp white
                                            color: replyText.trim() ? '#fff' : 'rgba(255,255,255,0.2)', 
                                            transition: 'color 0.2s ease, background-color 0.2s ease',
                                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
                                        }}
                                    >
                                        {isReplying ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : <SendIcon />}
                                    </IconButton>
                                </Paper>
                            </form>
                        ) : (
                            <Box sx={{ textAlign: 'center', p: 2, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                                <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>This ticket has been closed.</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* RIGHT COLUMN: THE INSPECTOR SIDEBAR */}
                <Box sx={{ 
                    width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3,
                    borderLeft: '1px solid rgba(255,255,255,0.08)', pl: 4
                }}>
                    {/* Details Panel */}
                    <Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', mb: 2 }}>
                            Ticket Details
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)', width: 40, height: 40 }}><PersonIcon sx={{ color: 'rgba(255,255,255,0.7)' }} /></Avatar>
                            <Box>
                                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Requester</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{ticketData.user_id}</Typography>
                            </Box>
                        </Box>

                        {isSuperAdmin && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                {/* Fixed the bright purple here. Now matches the grey of everything else. */}
                                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', width: 40, height: 40 }}><BusinessIcon /></Avatar>
                                <Box>
                                    <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Organization ID</Typography>
                                    <Typography sx={{ fontWeight: 600, fontFamily: 'monospace' }}>{ticketData.org_id.substring(0,12)}...</Typography>
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.7)', width: 40, height: 40 }}><CategoryIcon /></Avatar>
                            <Box>
                                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Category</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{category}</Typography>
                            </Box>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                            <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.05)', color: 'rgba(255,255,255,0.7)', width: 40, height: 40 }}><ConfirmationNumberIcon /></Avatar>
                            <Box>
                                <Typography sx={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>Created On</Typography>
                                <Typography sx={{ fontWeight: 600 }}>{new Date(ticketData.created_at).toLocaleDateString()}</Typography>
                            </Box>
                        </Box>
                    </Box>

                    {/* Properties Panel */}
                    <Box>
                        <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', mb: 2 }}>
                            Properties
                        </Typography>

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel sx={{ 
                                color: 'rgba(255,255,255,0.5)', 
                                '&.Mui-focused': { color: '#fff' } // Changed focus color
                            }}>
                                Status
                            </InputLabel>
                            <Select
                                value={ticketData.status}
                                label="Status"
                                onChange={(e) => handleUpdateTicket('status', e.target.value)}
                                sx={selectSx}
                            >
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="Closed">Closed</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel sx={{ 
                                color: 'rgba(255,255,255,0.5)', 
                                '&.Mui-focused': { color: '#fff' } // Changed focus color
                            }}>
                                Priority
                            </InputLabel>
                            <Select
                                value={ticketData.priority}
                                label="Priority"
                                onChange={(e) => handleUpdateTicket('priority', e.target.value)}
                                sx={selectSx}
                            >
                                <MenuItem value="Low">Low</MenuItem>
                                <MenuItem value="Medium">Medium</MenuItem>
                                <MenuItem value="High">High</MenuItem>
                            </Select>
                        </FormControl>

                        {!isClosed && (
                            <Button 
                                fullWidth
                                variant="outlined"
                                onClick={() => handleUpdateTicket('status', 'Closed')}
                                startIcon={<CheckCircleOutlineIcon />}
                                sx={{ 
                                    color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3)', textTransform: 'none', py: 1.5,
                                    borderRadius: '8px', transition: 'all 0.2s ease-in-out',
                                    '&:hover': { borderColor: '#ff4d4f', backgroundColor: 'rgba(255, 77, 79, 0.08)' }
                                }}
                            >
                                Close Ticket
                            </Button>
                        )}
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default TicketDetailView;