import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, TextField, Box, Typography, IconButton,
    ToggleButton, ToggleButtonGroup, Fade, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SendIcon from '@mui/icons-material/Send';
import { createTicket } from '../../api/ticketsApi';

const CreateTicketModal = ({ isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Medium');
    const [category, setCategory] = useState('General');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Smart Hack: We prepend the category to the description so we don't 
        // have to rewrite the Python backend database schema just for this UI upgrade!
        const fullDescription = `[Category: ${category}]\n\n${description}`;

        try {
            await createTicket({ title, description: fullDescription, priority });
            // Reset form
            setTitle('');
            setDescription('');
            setPriority('Medium');
            setCategory('General');
            onSuccess();
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to create ticket');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- DESIGNER-ALIGNED STYLING ---
    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            color: '#fff',
            backgroundColor: '#1a1a1a', // Matched to dashboard inputs
            borderRadius: '6px', // Matched to dashboard borders
            transition: 'all 0.2s ease-in-out',
            '& fieldset': { borderColor: '#333' },
            '&:hover fieldset': { borderColor: '#555' },
            '&.Mui-focused fieldset': { borderColor: '#888' }, // Clean grey focus, no neon
        },
        '& .MuiInputLabel-root': { color: '#888' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#fff' },
    };

    const toggleGroupSx = {
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid #333 !important',
            borderRadius: '6px !important',
            color: '#888',
            backgroundColor: '#1a1a1a',
            textTransform: 'none',
            px: 3,
            py: 1,
            transition: 'all 0.2s ease',
            '&.Mui-selected': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontWeight: 600,
                borderColor: '#666 !important'
            },
            '&:hover': {
                backgroundColor: '#222',
            }
        }
    };

    return (
        <Dialog 
            open={isOpen} 
            onClose={!isSubmitting ? onClose : undefined}
            TransitionComponent={Fade}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: { 
                    backgroundColor: '#111111', // Exact match to designer's background
                    color: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #222', // Exact match to designer's border
                    boxShadow: '0 24px 48px rgba(0,0,0,0.7)'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                {/* HEADER */}
                <DialogTitle sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    borderBottom: '1px solid #222', pb: 2, pt: 3, px: 4
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', // Removed neon green box
                            p: 1, borderRadius: '6px', display: 'flex', border: '1px solid #333'
                        }}>
                            <SupportAgentIcon fontSize="small" />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
                            Submit a Request
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} disabled={isSubmitting} sx={{ color: '#888', '&:hover': { color: '#fff' } }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                
                {/* BODY */}
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, px: 4, py: 4 }}>
                    {error && (
                        <Box sx={{ backgroundColor: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', border: '1px solid rgba(255, 77, 79, 0.3)', p: 2, borderRadius: '6px', fontSize: '0.85rem' }}>
                            {error}
                        </Box>
                    )}
                    
                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.8rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            1. What do you need help with?
                        </Typography>
                        <TextField
                            required
                            placeholder="e.g. Cannot connect to Workstation VPN"
                            fullWidth
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            sx={textFieldSx}
                        />
                    </Box>

                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.8rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            2. Issue Category
                        </Typography>
                        <ToggleButtonGroup
                            value={category}
                            exclusive
                            onChange={(e, newVal) => newVal && setCategory(newVal)}
                            sx={toggleGroupSx}
                        >
                            <ToggleButton value="Network">Network / VPN</ToggleButton>
                            <ToggleButton value="Hardware">Workstation</ToggleButton>
                            <ToggleButton value="Access">Access / IAM</ToggleButton>
                            <ToggleButton value="General">General</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>

                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.8rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            3. Priority Level
                        </Typography>
                        <ToggleButtonGroup
                            value={priority}
                            exclusive
                            onChange={(e, newVal) => newVal && setPriority(newVal)}
                            sx={{
                                ...toggleGroupSx,
                                // Color palette mapped to Designer's Risk Levels
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="Low"]': { backgroundColor: 'rgba(77, 166, 255, 0.1)', color: '#4da6ff', borderColor: 'rgba(77, 166, 255, 0.3) !important' },
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="Medium"]': { backgroundColor: 'rgba(255, 183, 77, 0.1)', color: '#ffb74d', borderColor: 'rgba(255, 183, 77, 0.3) !important' },
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="High"]': { backgroundColor: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3) !important' },
                            }}
                        >
                            <ToggleButton value="Low">Low</ToggleButton>
                            <ToggleButton value="Medium">Medium</ToggleButton>
                            <ToggleButton value="High">High / Urgent</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    
                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.8rem', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            4. Description
                        </Typography>
                        <TextField
                            required
                            placeholder="Please provide steps to reproduce, error codes, or any relevant details..."
                            fullWidth
                            multiline
                            rows={5}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            sx={textFieldSx}
                        />
                    </Box>
                </DialogContent>

                {/* FOOTER */}
                <DialogActions sx={{ p: 3, px: 4, borderTop: '1px solid #222', backgroundColor: '#161616' }}>
                    <Button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        sx={{ color: '#888', textTransform: 'none', fontWeight: 600, transition: 'color 0.2s', '&:hover': { color: '#fff', backgroundColor: 'transparent' } }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={isSubmitting || !title.trim() || !description.trim()}
                        endIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon sx={{ fontSize: 18 }} />}
                        sx={{ 
                            backgroundColor: '#fff', 
                            color: '#000',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '6px',
                            px: 3,
                            boxShadow: 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': { backgroundColor: '#e0e0e0', boxShadow: 'none' },
                            '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.1)', color: '#555' }
                        }}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Request'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default CreateTicketModal;