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

    // --- CUSTOM STYLING ---
    const textFieldSx = {
        '& .MuiOutlinedInput-root': {
            color: '#fff',
            backgroundColor: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&.Mui-focused fieldset': { borderColor: '#5aff3d' },
        },
        '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
        '& .MuiInputLabel-root.Mui-focused': { color: '#5aff3d' },
    };

    const toggleGroupSx = {
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1,
        '& .MuiToggleButtonGroup-grouped': {
            border: '1px solid rgba(255,255,255,0.1) !important',
            borderRadius: '8px !important',
            color: 'rgba(255,255,255,0.6)',
            textTransform: 'none',
            px: 3,
            py: 1,
            '&.Mui-selected': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                fontWeight: 600,
            },
            '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.05)',
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
                    backgroundColor: '#121212', // Deep dark theme
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.02), rgba(255,255,255,0.02))',
                    color: '#fff',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
                }
            }}
        >
            <form onSubmit={handleSubmit}>
                {/* HEADER */}
                <DialogTitle sx={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 2, pt: 3, px: 4
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ 
                            backgroundColor: 'rgba(90, 255, 61, 0.1)', color: '#5aff3d', 
                            p: 1, borderRadius: '8px', display: 'flex' 
                        }}>
                            <SupportAgentIcon />
                        </Box>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Submit a Request
                        </Typography>
                    </Box>
                    <IconButton onClick={onClose} disabled={isSubmitting} sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                
                {/* BODY */}
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, px: 4, py: 4 }}>
                    {error && (
                        <Box sx={{ backgroundColor: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', p: 2, borderRadius: '8px', fontSize: '0.85rem' }}>
                            {error}
                        </Box>
                    )}
                    
                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                        <Typography sx={{ mb: 1.5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                        <Typography sx={{ mb: 1.5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            3. Priority Level
                        </Typography>
                        <ToggleButtonGroup
                            value={priority}
                            exclusive
                            onChange={(e, newVal) => newVal && setPriority(newVal)}
                            sx={{
                                ...toggleGroupSx,
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="Low"]': { backgroundColor: 'rgba(90, 255, 61, 0.15)', color: '#5aff3d', borderColor: 'rgba(90, 255, 61, 0.3) !important' },
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="Medium"]': { backgroundColor: 'rgba(255, 183, 77, 0.15)', color: '#ffb74d', borderColor: 'rgba(255, 183, 77, 0.3) !important' },
                                '& .MuiToggleButtonGroup-grouped.Mui-selected[value="High"]': { backgroundColor: 'rgba(255, 77, 79, 0.15)', color: '#ff4d4f', borderColor: 'rgba(255, 77, 79, 0.3) !important' },
                            }}
                        >
                            <ToggleButton value="Low">Low</ToggleButton>
                            <ToggleButton value="Medium">Medium</ToggleButton>
                            <ToggleButton value="High">High / Urgent</ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    
                    <Box>
                        <Typography sx={{ mb: 1.5, fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                <DialogActions sx={{ p: 3, px: 4, borderTop: '1px solid rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <Button 
                        onClick={onClose} 
                        disabled={isSubmitting}
                        sx={{ color: 'rgba(255,255,255,0.6)', textTransform: 'none', fontWeight: 600, '&:hover': { color: '#fff' } }}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        disabled={isSubmitting || !title.trim() || !description.trim()}
                        endIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                        sx={{ 
                            backgroundColor: '#fff', 
                            color: '#000',
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: '8px',
                            px: 3,
                            '&:hover': { backgroundColor: 'rgba(255,255,255,0.8)' },
                            '&.Mui-disabled': { backgroundColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.4)' }
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