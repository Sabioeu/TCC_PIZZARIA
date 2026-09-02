package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ReservationRepository extends JpaRepository<Reservation, Long> { List<Reservation> findAllByBranchIdOrderByReservedForAsc(Long branchId); }
