from rest_framework import generics,status
from .models import Categoria, Estado, Prioridad, Servicio, Ticket, DetalleUsuarioTicket, FechaTicket,Usuario, Costo, PresupuestoTI
from apps.autenticacion.models import Departamento, Cargo
from apps.autenticacion.serializers import UsuarioSerializer
from .serializers import (
    DepartamentoSerializer, CargoSerializer, CategoriaSerializer, 
    EstadoSerializer, PrioridadSerializer, ServicioSerializer, 
    TicketSerializer, DetalleUsuarioTicketSerializer, FechaTicketSerializer,
)
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from .models import Usuario, Ticket
from django.db.models import Count
from apps.tickets.tasks import update_sla_status, definir_costo
from api.logger import logger


# Departamento Views
class DepartamentoListCreateView(generics.ListCreateAPIView):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer

class DepartamentoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Departamento.objects.all()
    serializer_class = DepartamentoSerializer

# Cargo Views
class CargoListCreateView(generics.ListCreateAPIView):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer

class CargoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Cargo.objects.all()
    serializer_class = CargoSerializer

# Categoria Views
class CategoriaListCreateView(generics.ListCreateAPIView):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

class CategoriaDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Estado Views
class EstadoListCreateView(generics.ListCreateAPIView):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer

class EstadoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Estado.objects.all()
    serializer_class = EstadoSerializer

# Prioridad Views
class PrioridadListCreateView(generics.ListCreateAPIView):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer

class PrioridadDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Prioridad.objects.all()
    serializer_class = PrioridadSerializer

# Servicio Views
class ServicioListCreateView(generics.ListCreateAPIView):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer

class ServicioDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Servicio.objects.all()
    serializer_class = ServicioSerializer

# Ticket Views
class TicketListCreateView(generics.ListCreateAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        logger.info(f"on:get_queryset. Authenticated user: {user}, role: {user.role}")
        definir_costo()
        update_sla_status()
        # Return all tickets for admin, else only tickets created by the user
        if user.role == 'admin':
            logger.info("on:get_queryset. User is admin, returning all tickets.")
            return Ticket.objects.all()
        
        logger.info("on:get_queryset. User is not admin, returning tickets created by this user.")
        return Ticket.objects.filter(user=user)

    def perform_create(self, serializer):
        # Retrieve authenticated user
        usuario_autenticado = self.request.user
        logger.info(f"on: perform_create. Authenticated user for ticket creation: {usuario_autenticado}")

        # Ensure user is instance of custom Usuario model
        if isinstance(usuario_autenticado, Usuario):
            serializer.save(user=usuario_autenticado)
            logger.info(f"on: perform_create.isinstance. Ticket created successfully for user: {usuario_autenticado.nom_usuario}")
        else:
            logger.error("on: perform_create.isinstance. Authenticated user is not an instance of Usuario.")
            raise ValueError("on: perform_create.isinstance. El usuario autenticado no es una instancia de Usuario.")
        ticket = serializer.instance
        # Create 'Creacion' date in FechaTicket
        FechaTicket.objects.create(
            ticket=ticket,
            tipo_fecha='Creacion',
            fecha= timezone.now()
            )
        logger.info("on: perform_create. FechaTicket entry created for ticket creation date.")
        # Access the 'servicio' related field from the ticket
        definir_costo(ticket_id=ticket.id)
        update_sla_status(ticket_id=ticket.id)

        
        

class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all()
    serializer_class = TicketSerializer

    def retrieve(self, request, *args, **kwargs):
        ticket = self.get_object()
        logger.info(f"Retrieving ticket: {ticket.id}")


        # Serialize ticket data
        ticket_data = self.get_serializer(ticket).data

        # Retrieve the most recent 'Creacion' date for the ticket
        fecha_creacion = FechaTicket.objects.filter(ticket=ticket, tipo_fecha='Creacion').order_by('-fecha').first()
        if fecha_creacion:
            ticket_data['fecha_creacion'] = fecha_creacion.fecha
            logger.info(f"Fecha de creación found: {fecha_creacion.fecha}")
        else:
            logger.warning("No creation date found for the ticket.")

        return Response(ticket_data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        logger.info(f"Updating ticket ID: {instance.id}")

        # Handle state update
        estado_id = request.data.get('estado')
        if estado_id:
            estado_obj = get_object_or_404(Estado, id=estado_id)
            request.data['estado'] = estado_obj.id
            logger.info(f"Estado updated to: {estado_obj.nom_estado}")

        # Handle user update
        user_id = request.data.get('user')
        if user_id:
            try:
                user = Usuario.objects.get(nom_usuario=user_id)
                request.data['user'] = user
                logger.info(f"Usuario updated to: {user.nom_usuario}")
            except Usuario.DoesNotExist:
                logger.error(f"User with ID {user_id} not found.")
                raise ValidationError({"user": "Usuario no encontrado"})
        
        # Remove empty dates if present
        if request.data.get('fecha_creacion') == '':
            logger.info("Removing empty 'fecha_creacion' from request data.")
            del request.data['fecha_creacion']
        if request.data.get('fecha_cierre_esperado') == '':
            logger.info("Removing empty 'fecha_cierre_esperado' from request data.")
            del request.data['fecha_cierre_esperado']
        if request.data.get('fecha_cierre') == '':
            logger.info("Removing empty 'fecha_cierre' from request data.")
            del request.data['fecha_cierre']

        # Serializar y actualizar el ticket
        serializer = self.get_serializer(instance, data=request.data, partial=partial)

        if not serializer.is_valid():
            logger.error(f"Serializer validation errors: {serializer.errors}")
        else:
            logger.info(f"Validated data: {serializer.validated_data}")
        self.perform_update(serializer)
        logger.info(f"Ticket ID {instance.id} updated successfully.")
        definir_costo(ticket_id=instance.id)
        # Si el estado cambia a "Cerrado", crea o actualiza la fecha de cierre
        if estado_obj.nom_estado == "Cerrado":
            fecha_cierre, created = FechaTicket.objects.get_or_create(
                ticket=instance, tipo_fecha='Cierre',
                defaults={'fecha': timezone.now()}
            )
            if created:
                logger.info(f"FechaTicket entry for cierre created: {fecha_cierre.fecha}")
            else:
                fecha_cierre.fecha = timezone.now()
                fecha_cierre.save()
                logger.info(f"FechaTicket entry for cierre updated to: {fecha_cierre.fecha}")

        return Response(serializer.data, status=status.HTTP_200_OK)
    
# DetalleUsuarioTicket Views
class DetalleUsuarioTicketListCreateView(generics.ListCreateAPIView):
    queryset = DetalleUsuarioTicket.objects.all()
    serializer_class = DetalleUsuarioTicketSerializer

class DetalleUsuarioTicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = DetalleUsuarioTicket.objects.all()
    serializer_class = DetalleUsuarioTicketSerializer

# FechaTicket Views
class FechaTicketListCreateView(generics.ListCreateAPIView):
    queryset = FechaTicket.objects.all()
    serializer_class = FechaTicketSerializer

class FechaTicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FechaTicket.objects.all()
    serializer_class = FechaTicketSerializer

class ClosedTicketListView(generics.ListAPIView):
    queryset = Ticket.objects.filter(estado__nom_estado='Cerrado')
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
def dashboard_stats(request):
    usuarios_totales = Usuario.objects.count()
    tickets_totales = Ticket.objects.count()
    tickets_abiertos = Ticket.objects.filter(estado__nom_estado="Abierto").count()
    tickets_cerrados = Ticket.objects.filter(estado__nom_estado="Cerrado").count()
    tickets_pendientes = Ticket.objects.filter(estado__nom_estado="Pendiente").count()
    # Agrega más estadísticas según necesites

    data = {
        "usuarios_totales": usuarios_totales,
        "tickets_totales": tickets_totales,
        "tickets_abiertos": tickets_abiertos,
        "tickets_cerrados": tickets_cerrados,
        "tickets_pendientes": tickets_pendientes,
        # Agrega otros datos aquí
    }
    return Response(data)

@api_view(['GET'])
def list_usuarios(request):
    usuarios = Usuario.objects.all()
    serializer = UsuarioSerializer(usuarios, many=True)
    return Response(serializer.data)