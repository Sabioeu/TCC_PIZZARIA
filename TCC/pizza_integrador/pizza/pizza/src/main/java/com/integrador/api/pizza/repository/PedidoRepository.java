package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Pedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PedidoRepository extends JpaRepository<Pedido, Long> {
    List<Pedido> findByClienteId(Long clienteId);
    List<Pedido> findByUsuarioId(Long usuarioId);
    List<Pedido> findByStatus(String status);
    List<Pedido> findByDataHoraBetween(LocalDateTime start, LocalDateTime end);

    // --- NOVO MÉTODO ---
    // Busca o pedido vinculado à mesa que ainda está com status "ABERTO"
    // Usamos Optional porque pode não haver nenhum pedido aberto no momento
    Optional<Pedido> findByMesaIdAndStatus(Long mesaId, String status);
}