import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from 'react-modal'; // Modal para el formulario
import '../App.css';
import guias from '../json_test/guias.json';
import apiClient from '../components/apiClient';

// Configura el estilo del modal
Modal.setAppElement('#root');

const Tickets = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    titulo: '',
    comentario: '',
    categoria: '',
    prioridad: '',
    servicio: '',
    estado: '', // Inicialmente vacío, se llenará al cargar los estados
  });// captura los datos del formulario para posterior post request
  

  const [categorias, setCategorias] = useState([]);
  const [prioridades, setPrioridades] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [estados, setEstados] = useState([]);
  
  const [modalIsOpen, setModalIsOpen] = useState(false); // Estado para el modal
  const [selectedCategoryId, setSelectedCategoryId] = useState(NaN);
  const [guiaContenido, setGuiaContenido] = useState(null);

  const handleGuiaChange = (e) => {
    const categoriaId = parseInt(e.target.value);
    
    setSelectedCategoryId(categoriaId);
    if (isNaN(selectedCategoryId)) {
      setGuiaContenido(null); // Si no hay categoría, no hay contenido
    } else {
      // Aquí busca el contenido de la guía basado en el id de la categoría
      const guia = guias.find(guia => guia.id_categoria === Number(categoriaId));
      console.log(e.target.value)
      setGuiaContenido(guia || null);
      
      const relatedService = servicios.find(
        (servicio) => servicio.categoria_id === categoriaId
      );

      setFormData((prevData) => ({
        ...prevData,
        categoria: categoriaId, // Establece la categoría en formData
        servicio: relatedService ? relatedService.id : '',
      }));
    }
  }; // maneja cambios en el la guia
  const handleOpenModal = () => {
    setModalIsOpen(true);
  }; // maneja el abrir el modal

  const handleCloseModal = () => {
    setModalIsOpen(false);
    setFormData((prevData) => ({
      ...prevData,
      titulo: '',
      comentario: '',
      prioridad: '',
    }));
  }; // manejea el cerrar el modal

  useEffect(() => {
    const fetchData = async (url, setState) => {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No estás autenticado. Por favor, inicia sesión.');
        navigate('/login');
        return;
      }

      try {
        const response = await apiClient.get(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        console.log(response.data)
        setState(response.data);
        console.log('data: ', response.data)
      } catch (error) {
        console.error(`Error al cargar los datos desde ${url}:`, error);
      }
    };

    // Cargar todas las listas de datos
    fetchData('categorias/', setCategorias);
    fetchData('prioridades/', setPrioridades);
    fetchData('servicios/', setServicios);
    fetchData('estados/', setEstados);
  }, [navigate]); // gets the data

  useEffect(() => {
    const estadoAbierto = estados.find((estado) => estado.nom_estado === 'Abierto');
    if (estadoAbierto) {
      setFormData((prevData) => ({
        ...prevData,
        estado: estadoAbierto.id,
      }));
    }
  }, [estados]);// Establecer el estado predeterminado como "Abierto" si existe en la lista de estados
  const handleCategoryChange = (e) => {
    const categoriaId = parseInt(e.target.value);
    setFormData((prevData) => ({
      ...prevData,
      categoria: categoriaId,
    }));

    const relatedService = servicios.find(
      (servicio) => servicio.categoria_id === categoriaId
    );

    setFormData((prevData) => ({
      ...prevData,
      servicio: relatedService ? relatedService.id : '',
    }));
  }; // manejo de cambios de categoria
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }; //manejo de cambios generales

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const adjustedData = {
      ...formData,
    };
    console.log(formData.titulo,
      formData.comentario,
      formData.categoria,
      formData.prioridad,
      formData.servicio,
      formData.estado)
    console.log(adjustedData)
    const token = localStorage.getItem('token');
    console.log(token)
    if (!token) {
      alert('No estás autenticado. Por favor, inicia sesión.');
      navigate('/login');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.post('tickets/', adjustedData, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response) {
        alert('Ticket creado con éxito');
        navigate('/tickets');
        setFormData({
          titulo: '',
          comentario: '',
          categoria: '',
          prioridad: '',
          servicio: '',
          estado: estados.find((estado) => estado.nom_estado === 'Abierto')?.id || '', // Restablecer a "Abierto"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Hubo un problema al crear el ticket');
    }
  }; // manda request post con datos importantes
  return (
    <div className="guia-usuario-container">
      <h2 className="guia-usuario-titulo">Creación de tickets</h2>

      <div className="lista-desplegable">
        <label>Selecciona una categoría:</label>
        <select onChange={handleGuiaChange} value={selectedCategoryId}>
          <option value="">Información general</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nom_categoria}
            </option>
          ))}
        </select>
      </div>

      {/* Renderiza información general si no hay categoría seleccionada */}
      {isNaN(selectedCategoryId) ? (
        <p>Info General</p>
      ) : (
        // Renderiza las instrucciones de la guía seleccionada
        guiaContenido && (
          <div className="guia-contenido">
            <h3>{guiaContenido.titulo}</h3>
            <ul>
              {guiaContenido.instrucciones.map((instruccion, index) => (
                <li key={index}>{instruccion}</li>
              ))}
            </ul>
          </div>
        )
      )}

      <button onClick={handleOpenModal} className="open-modal-button">
        🎫 Crear Ticket
      </button>

      {/* Modal para el formulario de creación de ticket */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModal}
        contentLabel="Crear Ticket"
        className="custom-modal"
        overlayClassName="modal-overlay"
      >
        <h2>Crear Ticket</h2>

      <form className="ticket-form" onSubmit={handleSubmit}>
          {/* Campos del formulario */}

          {/* Titulo */}
        <div className="input-group">
          <label>📝 Título</label>
          <input
            type="text"
            name="titulo"
            value={formData.titulo}
            onChange={handleChange}
            required
            placeholder="Escribe el título del ticket"
          />
        </div>

        {/* Comentario */}
        <div className="input-group">
          <label>💬 Comentario</label>
          <textarea
            name="comentario"
            value={formData.comentario}
            onChange={handleChange}
            required
            placeholder="Escribe un comentario"
          ></textarea>
        </div>

        {/* Categoría */}
        <div className="input-group">
          <label>📂 Categoría</label>
          <select
            name="categoria"
            value={formData.categoria}
            onChange={handleCategoryChange}
            required
          >
            <option value="">Seleccione una categoría</option>
            {categorias.map((categoria) => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nom_categoria}
              </option>
            ))}
          </select>
        </div>

        {/* Prioridad */}
        <div className="input-group">
          <label>⚡ Prioridad</label>
          <select
            name="prioridad"
            value={formData.prioridad}
            onChange={handleChange}
            required
          >
            <option value="">Seleccione una prioridad</option>
            {prioridades.map((prioridad) => (
              <option key={prioridad.id} value={prioridad.id}>
                {prioridad.num_prioridad}
              </option>
            ))}
          </select>
        </div>

        {/* Servicio */}
        <div className="input-group">
          <label>🔧 Servicio</label>
          <select
            name="servicio"
            value={formData.servicio}
            required
            disabled
          >
            <option value="">Seleccione un servicio</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.titulo_servicio}
              </option>
            ))}
          </select>
        </div>

        {/* Estado */}
        <div className="input-group">
          <label>📌 Estado</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
            disabled
          >
            {estados.map((estado) => (
              <option key={estado.id} value={estado.id}>
                {estado.nom_estado}
              </option>
            ))}
          </select>
        </div>

        <button type="submit">🚀 Crear Ticket</button>
      </form>

        {/*<button onClick={handleCloseModal}>Cerrar</button>*/}
      <Link to="/tickets-list" className="view-tickets-link">
        📋 Ver Lista de Tickets
      </Link>
      </Modal>
    </div>
  );
};

export default Tickets;
