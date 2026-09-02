package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.InventoryItem;
import org.springframework.data.jpa.repository.JpaRepository;
public interface InventoryRepository extends JpaRepository<InventoryItem, Long> { }
