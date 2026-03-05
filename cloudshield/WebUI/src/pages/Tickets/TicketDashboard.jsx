import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTickets } from '../../api/ticketsApi';
import CreateTicketModal from '../../components/Tickets/CreateTicketModal';

const TicketDashboard = () => {
    const { tickets, loading, error, refreshTickets } = useTickets();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    if (loading) return <div className="p-6">Loading support tickets...</div>;
    
    if (error) return (
        <div className="p-6 text-red-600">
            Error loading tickets: {error.message || "Please try again later."}
        </div>
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Support Helpdesk</h1>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
                >
                    + New Ticket
                </button>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tickets.length === 0 ? (
                            <tr>
                                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                                    No support tickets found.
                                </td>
                            </tr>
                        ) : (
                            tickets.map((ticket) => (
                                <tr 
                                    key={ticket.id} 
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ticket.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            ticket.status === 'Open' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {ticket.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ticket.priority}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <CreateTicketModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={refreshTickets} 
            />
        </div>
    );
};

export default TicketDashboard;