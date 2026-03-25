import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPost, apiPatch } from "./client"; 

async function parseApiResponse(response) {
  if (response && typeof response.json === "function") {
    return response.json();
  }
  return response;
}

// API Actions
export const createTicket = async (ticketData) => {
  const response = await apiPost('/tickets', ticketData);
  return parseApiResponse(response);
};

export const replyToTicket = async (ticketId, message) => {
  const response = await apiPost(`/tickets/${ticketId}/reply`, { message });
  return parseApiResponse(response);
};

export const updateTicketStatus = async (ticketId, status) => {
  const response = await apiPatch(`/tickets/${ticketId}/status`, { status });
  return parseApiResponse(response);
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

      const response = await apiGet("/tickets");
      const res = await parseApiResponse(response);

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
