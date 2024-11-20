import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../components/apiClient';
import '../styles/sla_data.css'

const SlaRelatedData = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);  // Added error state
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchData = async () => {
      // Fetch data from the backend API
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No estás autenticado. Por favor, inicia sesión.');
        navigate('/login');
        return;
      }
      
      try {
        const response = await apiClient.get('sla-presupuestos/', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError('Error al cargar los datos.');
      }
    };

    fetchData();  // Call the fetchData function inside useEffect
  }, [navigate]);

  const calcMonto_final = (monto, horasAtraso) => {
    return (monto * ( 1 + ( 0.05 * horasAtraso ))).toFixed(2);
  };
  const getResumenMonto = (amount) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
        return `${(amount / 1000).toFixed(2)}K`;
    } else {
        return `${amount}`;
    }
  };
  const getSlaCss = (sla_status) =>{
    if (sla_status === "Atrasado"){
      return 1
    }
    else if (sla_status === "En riesgo"){
      return 2
    }
    else{
      return 3
    }

  }
  const handleTicketClick = (Id) => {
    // Redirect to the edit ticket page
    navigate(`/tickets/edit/${Id}`);
  };

  if (error) {
    return <div>{error}</div>;  // Display error message if there's an error
  }

  if (!data) {
    return <div>Loading...</div>;
  }


  return (
    <div className="sla-related-data">
      <section className="budget-overview">
        <h1>Resumen del presupuesto de este mes</h1>
        <div className="budget-details">
          <p><strong>Presupuesto Mensual:</strong> ${getResumenMonto(data.presupuesto.presupuesto_mensual)}</p>
          <p><strong>Presupuesto Gastado:</strong> ${getResumenMonto(data.presupuesto.presupuesto_gastado)}</p>
          <p><strong>Fecha del Presupuesto:</strong> {data.presupuesto.fecha_presupuesto}</p>
          <p><strong>Presupuesto Restante:</strong> ${getResumenMonto(data.presupuesto.presupuesto_restante)}</p>
          <p><strong>presupuesto exedido:</strong> {data.presupuesto.over_budget ? "Yes" : "No"}</p>
        </div>
      </section>

      <section className="worst-tickets">
        <h2>Tickets por horas de atraso</h2>
        <table className="tickets-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Titulo Ticket</th>
              <th>Status SLA</th>
              <th>Costo de Ticket original</th>
              <th>Fecha de Cierre Esperado</th>
              <th>Horas de atraso</th>
              <th>Costo Estimado Del ticket</th>
            </tr>
          </thead>
          <tbody>
            {data.worst_tickets.map((ticket) => (
              <tr key={ticket.ticket_id} onClick={() => handleTicketClick(ticket.id)} style={{ cursor: 'pointer' }}>
                <td>{ticket.id}</td>
                <td>{ticket.title}</td>
                <td><span className={`priority-badge priority-${getSlaCss(ticket.sla_status)}`}>
                  {ticket.sla_status}
                </span></td>
                <td>${getResumenMonto(ticket.monto)}</td>
                <td>{ticket.dates.find(date => date.type === 'cierre_esperado')?.date}</td>
                <td>{ticket.horas_atraso}Hrs</td>
                <td>${getResumenMonto(calcMonto_final(ticket.monto, ticket.horas_atraso))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
};
export default SlaRelatedData;