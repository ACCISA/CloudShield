import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { replyToTicket, updateTicketStatus } from '../../api/ticketsApi';

const TicketDetailView = () => {
    const { ticketId } = useParams();
    const [ticketData, setTicketData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);

    const loadTicket = async () => {
        try {
            setLoading(true);
            const data = await apiGet(`/tickets/${ticketId}`);
            setTicketData(data);
        } catch (err) {
            setError(err.message || "Failed to load ticket");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTicket();
    }, [ticketId]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        
        setIsReplying(true);
        try {
            await replyToTicket(ticketId, replyText);
            setReplyText('');
            await loadTicket(); // Refresh thread to show new message
        } catch (err) {
            alert("Failed to send reply: " + err.message);
        } finally {
            setIsReplying(false);
        }
    };

    const handleCloseTicket = async () => {
        if (!window.confirm("Are you sure you want to close this ticket?")) return;
        try {
            await updateTicketStatus(ticketId, "Closed");
            await loadTicket();
        } catch (err) {
            alert("Failed to close ticket: " + err.message);
        }
    };

    if (loading) return <div className="p-6">Loading thread...</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;
    if (!ticketData) return <div className="p-6">Ticket not found.</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="mb-4">
                <Link to="/support" className="text-blue-600 hover:underline">&larr; Back to Helpdesk</Link>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">{ticketData.title}</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Status: <span className="font-semibold">{ticketData.status}</span> | 
                            Priority: <span className="font-semibold">{ticketData.priority}</span>
                        </p>
                    </div>
                    {ticketData.status !== 'Closed' && (
                        <button 
                            onClick={handleCloseTicket}
                            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300 text-sm"
                        >
                            Mark as Closed
                        </button>
                    )}
                </div>
                <div className="p-4 bg-gray-50 rounded text-gray-800 whitespace-pre-wrap">
                    {ticketData.description}
                </div>
            </div>

            <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold border-b pb-2">Conversation History</h3>
                {ticketData.replies?.length === 0 ? (
                    <p className="text-gray-500 text-sm italic">No replies yet.</p>
                ) : (
                    ticketData.replies?.map((reply) => (
                        <div key={reply.id} className="bg-white shadow-sm rounded-lg p-4 border border-gray-100">
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span className="font-semibold">{reply.user_id}</span>
                                <span>{new Date(reply.created_at).toLocaleString()}</span>
                            </div>
                            <div className="text-gray-800">{reply.message}</div>
                        </div>
                    ))
                )}
            </div>

            {ticketData.status !== 'Closed' && (
                <form onSubmit={handleReply} className="bg-white shadow rounded-lg p-4">
                    <textarea 
                        className="w-full border border-gray-300 rounded-md p-3 mb-3 focus:ring-blue-500 focus:border-blue-500"
                        rows="3" 
                        placeholder="Type your reply here..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        required
                    />
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isReplying}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isReplying ? 'Sending...' : 'Send Reply'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default TicketDetailView;