import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, TextField, 
    InputAdornment, Tabs, Tab, Card, CardContent 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import { useTickets } from '../../api/ticketsApi';
import { apiGet } from '../../api/client';
import CreateTicketModal from '../../components/Tickets/CreateTicketModal';

const TicketDashboard = () => {
    const { tickets, loading, error, refreshTickets } = useTickets();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    
    // New State for Search and Filtering
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    
    const navigate = useNavigate();

    // Fetch the current user to check if they are the Super Admin
    useEffect(() => {
        let mounted = true;
        apiGet('/users/me')
            .then(res => {
                if (mounted) setUserEmail(res.user?.email || "");
            })
            .catch(err => console.error("Failed to fetch user email", err));
            
        return () => { mounted = false; };
    }, []);

    const isSuperAdmin = userEmail === "support@cloudshield.com";

    // --- METRICS CALCULATION ---
    const metrics = useMemo(() => {
        if (!tickets) return { total: 0, open: 0, closed: 0, highPriority: 0 };
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'Open').length,
            closed: tickets.filter(t => t.status === 'Closed').length,
            highPriority: tickets.filter(t => t.priority === 'High' && t.status !== 'Closed').length,
        };
    }, [tickets]);

    // --- SEARCH AND FILTER LOGIC ---
    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(ticket => {
            const matchesStatus = statusFilter === "All" || ticket.status === statusFilter;
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                ticket.title.toLowerCase().includes(searchLower) || 
                (ticket.description && ticket.description.toLowerCase().includes(searchLower)) ||
                (isSuperAdmin && ticket.org_id && ticket.org_id.toLowerCase().includes(searchLower));
            
            return matchesStatus && matchesSearch;
        });
    }, [tickets, statusFilter, searchTerm, isSuperAdmin]);

    if (loading) return <Box sx={{ p: 4, color: 'rgba(255,255,255,0.7)' }}>Loading support tickets...</Box>;
    if (error) return <Box sx={{ p: 4, color: '#ff4d4f' }}>Error loading tickets: {error.message || "Please try again later."}</Box>;

    // Shared styling for the Metric Cards
    const MetricCard = ({ title, value, icon, color }) => (
        <Card sx={{ 
            backgroundColor: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '12px',
            minWidth: '200px',
            flex: 1
        }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: '24px !important' }}>
                <Box sx={{ 
                    backgroundColor: `${color}15`, // Adds 15% opacity to the hex color
                    color: color,
                    p: 1.5,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    {icon}
                </Box>
                <Box>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, mt: 0.5 }}>
                        {value}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ p: 4, width: '100%', color: '#fff', maxWidth: '1400px', mx: 'auto' }}>
            {/* Header Area */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: '0.5px' }}>
                    {isSuperAdmin ? "Global Support Helpdesk" : "Support Helpdesk"}
                </Typography>
                {!isSuperAdmin && (
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={() => setIsModalOpen(true)}
                        sx={{ 
                            backgroundColor: '#fff', 
                            color: '#000',
                            textTransform: 'none',
                            borderRadius: '8px',
                            fontWeight: 600,
                            padding: '8px 20px',
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.8)' }
                        }}
                    >
                        Create Ticket
                    </Button>
                )}
            </Box>

            {/* Metrics Row */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <MetricCard title="Total Tickets" value={metrics.total} icon={<ConfirmationNumberIcon />} color="#6a4fcf" />
                <MetricCard title="Open Issues" value={metrics.open} icon={<PendingActionsIcon />} color="#5aff3d" />
                <MetricCard title="Closed" value={metrics.closed} icon={<CheckCircleIcon />} color="#a0a0a0" />
                <MetricCard title="High Priority" value={metrics.highPriority} icon={<PriorityHighIcon />} color="#ff4d4f" />
            </Box>

            {/* Toolbar: Search and Filters */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-end',
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Tabs 
                    value={statusFilter} 
                    onChange={(e, newValue) => setStatusFilter(newValue)}
                    sx={{
                        minHeight: '40px',
                        '& .MuiTabs-indicator': { backgroundColor: '#5aff3d' },
                        '& .MuiTab-root': { 
                            color: 'rgba(255,255,255,0.5)', 
                            textTransform: 'none', 
                            fontSize: '0.95rem',
                            fontWeight: 500,
                            minHeight: '40px',
                            px: 3
                        },
                        '& .Mui-selected': { color: '#fff !important' }
                    }}
                >
                    <Tab label="All Tickets" value="All" />
                    <Tab label="Open" value="Open" />
                    <Tab label="Closed" value="Closed" />
                </Tabs>

                <TextField
                    placeholder={isSuperAdmin ? "Search tickets or Org ID..." : "Search tickets..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    variant="outlined"
                    size="small"
                    sx={{
                        width: '300px',
                        '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            backgroundColor: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                            '&.Mui-focused fieldset': { borderColor: '#5aff3d' },
                        }
                    }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Dark Theme Table */}
            <TableContainer sx={{ 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                overflow: 'hidden'
            }}>
                <Table>
                    <TableHead sx={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <TableRow>
                            {isSuperAdmin && (
                                <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>
                                    Org ID
                                </TableCell>
                            )}
                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Title</TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Status</TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Priority</TableCell>
                            <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600, textAlign: 'right' }}>Date</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isSuperAdmin ? 5 : 4} sx={{ textAlign: 'center', py: 8, color: 'rgba(255,255,255,0.4)', borderBottom: 'none' }}>
                                    {searchTerm || statusFilter !== "All" 
                                        ? "No tickets match your search criteria." 
                                        : "No support tickets found. You're all caught up!"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTickets.map((ticket) => (
                                <TableRow 
                                    key={ticket.id}
                                    hover
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    sx={{ 
                                        cursor: 'pointer',
                                        '&:last-child td, &:last-child th': { border: 0 },
                                        '&:hover': { backgroundColor: 'rgba(255,255,255,0.04) !important' }
                                    }}
                                >
                                    {isSuperAdmin && (
                                        <TableCell sx={{ color: '#b9ff9f', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                            {ticket.org_id ? ticket.org_id.substring(0, 8) + '...' : 'Unknown'}
                                        </TableCell>
                                    )}
                                    <TableCell sx={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 500 }}>
                                        {ticket.title}
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <Chip 
                                            label={ticket.status} 
                                            size="small"
                                            sx={{ 
                                                backgroundColor: ticket.status === 'Open' ? 'rgba(90, 255, 61, 0.15)' : 'rgba(255,255,255,0.1)',
                                                color: ticket.status === 'Open' ? '#5aff3d' : 'rgba(255,255,255,0.7)',
                                                fontWeight: 600,
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <Chip 
                                            label={ticket.priority} 
                                            size="small"
                                            sx={{ 
                                                backgroundColor: ticket.priority === 'High' ? 'rgba(255, 77, 79, 0.15)' : 'transparent',
                                                color: ticket.priority === 'High' ? '#ff4d4f' : 'rgba(255,255,255,0.6)',
                                                border: ticket.priority === 'High' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                                fontWeight: 500,
                                                borderRadius: '6px',
                                                fontSize: '0.75rem'
                                            }} 
                                        />
                                    </TableCell>
                                    <TableCell sx={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right' }}>
                                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <CreateTicketModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={refreshTickets} 
            />
        </Box>
    );
};

export default TicketDashboard;