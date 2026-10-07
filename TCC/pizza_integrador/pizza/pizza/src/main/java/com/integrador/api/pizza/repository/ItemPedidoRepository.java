package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.ItemPedido;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ItemPedidoRepository extends JpaRepository<ItemPedido, Long> {
    /**
     * Busca todos os itens associados a um pedido específico.
     * @param pedidoId O ID do pedido.
     * @return Uma lista de ItemPedido.
     */
    List<ItemPedido> findByPedidoId(Long pedidoId);
}