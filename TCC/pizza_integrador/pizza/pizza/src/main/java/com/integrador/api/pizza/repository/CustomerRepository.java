package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CustomerRepository extends JpaRepository<Customer, Long> { }
