import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch } from "./client"; 

// API Actions
export const createTicket = async (ticketData) => {
  return await apiPost('/tickets', ticketData);
};

export const replyToTicket = async (ticketId, message) => {
  return await apiPost(`/tickets/${ticketId}/reply`, { message });
};

export const updateTicketStatus = async (ticketId, status) => {
  return await apiPatch(`/tickets/${ticketId}/status`, { status });
};

// Hooks
export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    let mounted = true;
    try {
      setLoading(true);
      setError(null);

      const res = await apiGet("/tickets");

      if (!mounted) return;
      
      // Ensure tickets is always an array
      setTickets(Array.isArray(res) ? res : res?.tickets ?? []);
    } catch (e) {
      if (!mounted) return;
      setError(e);
      setTickets([]);
    } finally {
      if (mounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {}; 
  }, [load]);

  return { tickets, loading, error, refreshTickets: load };
}