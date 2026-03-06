import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Button, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, TextField, 
    InputAdornment, Card, CardContent, IconButton, Popover,
    FormGroup, FormControlLabel, Checkbox, Divider, Pagination,
    SvgIcon
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useTickets } from '../../api/ticketsApi';
import { apiGet } from '../../api/client';
import CreateTicketModal from '../../components/Tickets/CreateTicketModal';

// --- CUSTOM DESIGNER ICONS ---
const HighRiskIcon = (props) => (
    <SvgIcon viewBox="0 0 16 16" {...props}>
        <path d="M4.73872 1.9191C5.1138 1.54403 5.6225 1.33331 6.15294 1.33331H9.84838C10.3788 1.33331 10.8875 1.54403 11.2626 1.9191L14.0815 4.73805C14.4566 5.11313 14.6673 5.62183 14.6673 6.15227V9.84771C14.6673 10.3781 14.4566 10.8868 14.0815 11.2619L11.2626 14.0808C10.8875 14.4559 10.3788 14.6666 9.84838 14.6666H6.15294C5.6225 14.6666 5.1138 14.4559 4.73872 14.0808L1.91977 11.2619C1.5447 10.8868 1.33398 10.3781 1.33398 9.84771V6.15227C1.33398 5.62183 1.5447 5.11313 1.91977 4.73805L4.73872 1.9191ZM8.66732 5.33331C8.66732 4.96513 8.36885 4.66665 8.00065 4.66665C7.63245 4.66665 7.33398 4.96513 7.33398 5.33331V8.66665C7.33398 9.03485 7.63245 9.33331 8.00065 9.33331C8.36885 9.33331 8.66732 9.03485 8.66732 8.66665V5.33331ZM8.66732 10.6592C8.66732 10.291 8.36885 9.99251 8.00065 9.99251C7.63245 9.99251 7.33398 10.291 7.33398 10.6592V10.6666C7.33398 11.0348 7.63245 11.3333 8.00065 11.3333C8.36885 11.3333 8.66732 11.0348 8.66732 10.6666V10.6592Z" fill="currentColor"/>
    </SvgIcon>
);

const MediumRiskIcon = (props) => (
    <SvgIcon viewBox="0 0 16 16" {...props}>
        <path d="M7.33268 8.66667C7.33268 9.03487 7.63115 9.33333 7.99935 9.33333C8.36755 9.33333 8.66602 9.03487 8.66602 8.66667V6.66667C8.66602 6.29848 8.36755 6 7.99935 6C7.63115 6 7.33268 6.29848 7.33268 6.66667V8.66667ZM8.66602 10.6592C8.66602 10.291 8.36755 9.99253 7.99935 9.99253C7.63115 9.99253 7.33268 10.291 7.33268 10.6592V10.6667C7.33268 11.0349 7.63115 11.3333 7.99935 11.3333C8.36755 11.3333 8.66602 11.0349 8.66602 10.6667V10.6592ZM6.25092 3.10757C7.01295 1.73595 8.98555 1.73595 9.74755 3.10757L14.1482 11.0287C14.8888 12.3618 13.9248 14 12.3999 14H3.59858C2.07361 14 1.10968 12.3618 1.85026 11.0287L6.25092 3.10757Z" fill="currentColor"/>
    </SvgIcon>
);

const LowRiskIcon = (props) => (
    <SvgIcon viewBox="0 0 16 16" {...props}>
        <path d="M6.66667 13.3333C2.98467 13.3333 0 10.3487 0 6.66667C0 2.98533 2.98467 0 6.66667 0C10.3487 0 13.3333 2.98533 13.3333 6.66667C13.3333 10.3487 10.3487 13.3333 6.66667 13.3333ZM6.66667 3.33333C6.48986 3.33333 6.32029 3.40357 6.19526 3.5286C6.07024 3.65362 6 3.82319 6 4V7.33333C6 7.51014 6.07024 7.67971 6.19526 7.80474C6.32029 7.92976 6.48986 8 6.66667 8C6.84348 8 7.01305 7.92976 7.13807 7.80474C7.2631 7.67971 7.33333 7.51014 7.33333 7.33333V4C7.33333 3.82319 7.2631 3.65362 7.13807 3.5286C7.01305 3.40357 6.84348 3.33333 6.66667 3.33333ZM6.66667 10C6.84348 10 7.01305 9.92976 7.13807 9.80474C7.2631 9.67971 7.33333 9.51014 7.33333 9.33333C7.33333 9.15652 7.2631 8.98695 7.13807 8.86193C7.01305 8.73691 6.84348 8.66667 6.66667 8.66667C6.48986 8.66667 6.32029 8.73691 6.19526 8.86193C6.07024 8.98695 6 9.15652 6 9.33333C6 9.51014 6.07024 9.67971 6.19526 9.80474C6.32029 9.92976 6.48986 10 6.66667 10Z" fill="currentColor"/>
    </SvgIcon>
);
// ------------------------------

const TicketDashboard = () => {
    const { tickets, loading, error, refreshTickets } = useTickets();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    
    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterAnchorEl, setFilterAnchorEl] = useState(null);
    const [selectedStatuses, setSelectedStatuses] = useState(['Open', 'Pending', 'Closed']);
    const [selectedPriorities, setSelectedPriorities] = useState(['High', 'Medium', 'Low']);
    
    // Pagination State
    const [page, setPage] = useState(1);
    const rowsPerPage = 6;

    const navigate = useNavigate();

    // Fetch user for Super Admin check
    useEffect(() => {
        let mounted = true;
        apiGet('/users/me').then(res => {
            if (mounted) setUserEmail(res.user?.email || "");
        }).catch(err => console.error("Failed to fetch user email", err));
        return () => { mounted = false; };
    }, []);

    const isSuperAdmin = userEmail === "support@cloudshield.com";

    // --- METRICS CALCULATION ---
    const metrics = useMemo(() => {
        if (!tickets) return { total: 0, open: 0, closed: 0, highPriority: 0 };
        return {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'Open' || t.status === 'Pending').length,
            closed: tickets.filter(t => t.status === 'Closed').length,
            highPriority: tickets.filter(t => t.priority === 'High' && t.status !== 'Closed').length,
        };
    }, [tickets]);

    // --- SEARCH AND FILTER LOGIC ---
    const filteredTickets = useMemo(() => {
        if (!tickets) return [];
        return tickets.filter(ticket => {
            const matchesStatus = selectedStatuses.includes(ticket.status);
            const matchesPriority = selectedPriorities.includes(ticket.priority);
            
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = 
                ticket.title.toLowerCase().includes(searchLower) || 
                (isSuperAdmin && ticket.org_id && ticket.org_id.toLowerCase().includes(searchLower));
            
            return matchesStatus && matchesPriority && matchesSearch;
        });
    }, [tickets, selectedStatuses, selectedPriorities, searchTerm, isSuperAdmin]);

    // Pagination Calculation
    const paginatedTickets = filteredTickets.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // Filter Popover Handlers
    const handleFilterClick = (event) => setFilterAnchorEl(event.currentTarget);
    const handleFilterClose = () => setFilterAnchorEl(null);
    const openFilter = Boolean(filterAnchorEl);

    const handleToggleFilter = (list, setList, value) => {
        setList(prev => 
            prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]
        );
    };

    if (loading) return <Box sx={{ p: 4, color: '#888' }}>Loading support tickets...</Box>;
    if (error) return <Box sx={{ p: 4, color: '#ff4d4f' }}>Error loading tickets: {error.message}</Box>;

    const MetricCard = ({ title, value }) => (
        <Card sx={{ 
            backgroundColor: '#111111', 
            border: '1px solid #222',
            borderRadius: '8px',
            minWidth: '200px',
            flex: 1,
            boxShadow: 'none'
        }}>
            <CardContent sx={{ p: '20px !important' }}>
                <Typography sx={{ color: '#888', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {title}
                </Typography>
                <Typography variant="h4" sx={{ color: '#fff', fontWeight: 500, mt: 1 }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );

    const checkboxSx = {
        color: '#444',
        '&.Mui-checked': { color: '#fff' },
        padding: '4px 8px'
    };

    return (
        <Box sx={{ p: 4, width: '100%', color: '#fff', maxWidth: '1400px', mx: 'auto' }}>
            
            {/* Header Area */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {isSuperAdmin ? "Global Support Helpdesk" : "Support Helpdesk"}
                </Typography>
                {!isSuperAdmin && (
                    <Button 
                        variant="contained" 
                        startIcon={<AddIcon />}
                        onClick={() => setIsModalOpen(true)}
                        sx={{ 
                            backgroundColor: '#fff', color: '#000', textTransform: 'none',
                            borderRadius: '6px', fontWeight: 600, padding: '6px 16px',
                            '&:hover': { backgroundColor: '#e0e0e0' }
                        }}
                    >
                        Create Ticket
                    </Button>
                )}
            </Box>

            {/* Metrics Row */}
            <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <MetricCard title="Total Tickets" value={metrics.total} />
                <MetricCard title="Active Issues" value={metrics.open} />
                <MetricCard title="High Priority" value={metrics.highPriority} />
                <MetricCard title="Resolved" value={metrics.closed} />
            </Box>

            {/* THE MAIN DATA CONTAINER */}
            <Box sx={{ 
                backgroundColor: '#111111', 
                border: '1px solid #222',
                borderRadius: '12px',
                overflow: 'hidden',
                pb: 1
            }}>
                {/* Toolbar */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #222' }}>
                    <Typography sx={{ fontWeight: 600, fontSize: '1.1rem' }}>Support Tickets</Typography>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField
                            placeholder="Search tickets"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{
                                width: '250px',
                                '& .MuiOutlinedInput-root': {
                                    color: '#fff', backgroundColor: '#1a1a1a', borderRadius: '6px',
                                    '& fieldset': { borderColor: '#333' },
                                    '&:hover fieldset': { borderColor: '#555' },
                                    '&.Mui-focused fieldset': { borderColor: '#888' },
                                }
                            }}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#888', fontSize: 20 }} /></InputAdornment>,
                            }}
                        />
                        <Button 
                            variant="outlined" 
                            startIcon={<FilterListIcon />}
                            onClick={handleFilterClick}
                            sx={{ 
                                color: '#fff', borderColor: '#333', backgroundColor: '#1a1a1a', 
                                textTransform: 'none', borderRadius: '6px',
                                '&:hover': { borderColor: '#555', backgroundColor: '#222' }
                            }}
                        >
                            Filter
                        </Button>
                        <IconButton onClick={refreshTickets} sx={{ color: '#fff', border: '1px solid #333', borderRadius: '6px', backgroundColor: '#1a1a1a' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Box>
                </Box>

                {/* Filter Popover */}
                <Popover
                    open={openFilter}
                    anchorEl={filterAnchorEl}
                    onClose={handleFilterClose}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{
                        sx: { backgroundColor: '#161616', border: '1px solid #333', borderRadius: '8px', width: '220px', color: '#fff', mt: 1 }
                    }}
                >
                    <Box sx={{ p: 2 }}>
                        <Typography sx={{ color: '#888', fontSize: '0.7rem', fontWeight: 700, mb: 1, letterSpacing: '0.5px' }}>PRIORITY LEVEL</Typography>
                        <FormGroup>
                            {['High', 'Medium', 'Low'].map(prio => (
                                <FormControlLabel 
                                    key={prio} 
                                    control={<Checkbox checked={selectedPriorities.includes(prio)} onChange={() => handleToggleFilter(selectedPriorities, setSelectedPriorities, prio)} sx={checkboxSx} />} 
                                    label={<Typography sx={{ fontSize: '0.85rem' }}>{prio}</Typography>} 
                                    sx={{ m: 0, justifyContent: 'space-between', flexDirection: 'row-reverse' }}
                                />
                            ))}
                        </FormGroup>

                        <Divider sx={{ borderColor: '#333', my: 1.5 }} />

                        <Typography sx={{ color: '#888', fontSize: '0.7rem', fontWeight: 700, mb: 1, letterSpacing: '0.5px' }}>STATUS</Typography>
                        <FormGroup>
                            {['Open', 'Pending', 'Closed'].map(stat => (
                                <FormControlLabel 
                                    key={stat} 
                                    control={<Checkbox checked={selectedStatuses.includes(stat)} onChange={() => handleToggleFilter(selectedStatuses, setSelectedStatuses, stat)} sx={checkboxSx} />} 
                                    label={<Typography sx={{ fontSize: '0.85rem' }}>{stat}</Typography>} 
                                    sx={{ m: 0, justifyContent: 'space-between', flexDirection: 'row-reverse' }}
                                />
                            ))}
                        </FormGroup>
                    </Box>
                </Popover>

                {/* Minimalist Table */}
                <TableContainer>
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead>
                            <TableRow>
                                {isSuperAdmin && <TableCell sx={{ color: '#888', borderBottom: '1px solid #222', fontSize: '0.85rem', pb: 1 }}>Org ID</TableCell>}
                                <TableCell sx={{ color: '#888', borderBottom: '1px solid #222', fontSize: '0.85rem', pb: 1 }}>Ticket Title</TableCell>
                                <TableCell sx={{ color: '#888', borderBottom: '1px solid #222', fontSize: '0.85rem', pb: 1 }}>Date</TableCell>
                                <TableCell sx={{ color: '#888', borderBottom: '1px solid #222', fontSize: '0.85rem', pb: 1 }}>Priority</TableCell>
                                <TableCell sx={{ color: '#888', borderBottom: '1px solid #222', fontSize: '0.85rem', pb: 1 }}>Status</TableCell>
                                <TableCell sx={{ borderBottom: '1px solid #222', pb: 1 }} align="right"></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isSuperAdmin ? 6 : 5} sx={{ textAlign: 'center', py: 6, color: '#666', borderBottom: 'none' }}>
                                        No tickets found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                // --- ADDED INDEX HERE FOR ZEBRA STRIPING ---
                                paginatedTickets.map((ticket, index) => {
                                    
                                    // Custom Designer Icons applied here
                                    let priorityIcon, priorityColor;
                                    if (ticket.priority === 'High') {
                                        priorityIcon = <HighRiskIcon sx={{ fontSize: 16, color: '#ff4d4f' }} />;
                                        priorityColor = '#ff4d4f'; 
                                    } else if (ticket.priority === 'Medium') {
                                        priorityIcon = <MediumRiskIcon sx={{ fontSize: 16, color: '#ffb74d' }} />;
                                        priorityColor = '#ffb74d'; 
                                    } else {
                                        priorityIcon = <LowRiskIcon sx={{ fontSize: 16, color: '#4da6ff' }} />;
                                        priorityColor = '#4da6ff'; 
                                    }

                                    return (
                                        <TableRow 
                                            key={ticket.id}
                                            hover
                                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                                            sx={{ 
                                                cursor: 'pointer',
                                                // --- THE ZEBRA STRIPING LOGIC ---
                                                backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                                                '&:hover': { backgroundColor: '#222 !important' },
                                                '& td': { borderBottom: '1px solid #222', py: 2 }
                                            }}
                                        >
                                            {isSuperAdmin && (
                                                <TableCell sx={{ color: '#888', fontSize: '0.85rem' }}>
                                                    {ticket.org_id ? ticket.org_id.substring(0, 8) + '...' : 'Unknown'}
                                                </TableCell>
                                            )}
                                            <TableCell sx={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                                                {ticket.title}
                                            </TableCell>
                                            <TableCell sx={{ color: '#888', fontSize: '0.85rem' }}>
                                                {ticket.created_at ? new Date(ticket.created_at).toLocaleString([], { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit' }) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {priorityIcon}
                                                    <Typography sx={{ color: priorityColor, fontSize: '0.85rem', fontWeight: 500 }}>
                                                        {ticket.priority}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ color: ticket.status === 'Closed' ? '#888' : '#fff', fontSize: '0.85rem' }}>
                                                {ticket.status}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton size="small" sx={{ color: '#555', '&:hover': { color: '#fff' } }}>
                                                    <EditOutlinedIcon fontSize="small" />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Footer / Pagination matching mockup */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderTop: '1px solid #222' }}>
                    <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>
                        Showing {filteredTickets.length > 0 ? ((page - 1) * rowsPerPage) + 1 : 0}-
                        {Math.min(page * rowsPerPage, filteredTickets.length)} of {filteredTickets.length} tickets
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Pagination 
                            count={Math.ceil(filteredTickets.length / rowsPerPage) || 1} 
                            page={page} 
                            onChange={(e, value) => setPage(value)}
                            shape="rounded"
                            sx={{
                                '& .MuiPaginationItem-root': { color: '#888', border: '1px solid transparent' },
                                '& .MuiPaginationItem-root:hover': { backgroundColor: '#222' },
                                '& .Mui-selected': { backgroundColor: '#fff !important', color: '#000', fontWeight: 600 },
                                '& .MuiPaginationItem-previousNext': { border: '1px solid #333' }
                            }}
                        />
                        <Typography sx={{ color: '#666', fontSize: '0.85rem' }}>
                            Page {page} of {Math.ceil(filteredTickets.length / rowsPerPage) || 1}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            <CreateTicketModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={refreshTickets} 
            />
        </Box>
    );
};

export default TicketDashboard;