// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const Login = () => {
  const [formData, setFormData] = useState({
    correo: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Realizar solicitud POST para autenticación
      const response = await axios.post('http://127.0.0.1:8000/api/token/', formData);
      
      // Almacenar el token en localStorage
      localStorage.setItem('token', response.data.access);

      // Redirigir al dashboard en lugar de a tickets
      navigate('/dashboard');
    } catch (error) {
      // Manejo de errores
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  return (
    <div className="login-container">
      <form className="login-box" onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>

        {error && <p className="error">{error}</p>}

        <div className="input-group">
          <input
            type="email"
            name="correo"
            placeholder="Correo Electrónico"
            value={formData.correo}
            onChange={handleChange}
            required
          />
          <span className="icon">✉️</span>
        </div>

        <div className="input-group">
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <span className="icon">🔒</span>
        </div>

        <button type="submit">Iniciar Sesión</button>
        <p>¿No tienes una cuenta?</p>
        <p>Habla con el equipo de IT</p>
      </form>
    </div>
  );
};

export default Login;