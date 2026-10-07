package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    // Você pode adicionar métodos personalizados aqui, como:
    // Optional<Cliente> findByCpf(String cpf);
}