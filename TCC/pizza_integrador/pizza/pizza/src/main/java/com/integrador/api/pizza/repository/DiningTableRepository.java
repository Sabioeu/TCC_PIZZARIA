package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.DiningTable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> { Optional<DiningTable> findByNumber(Integer number); }
