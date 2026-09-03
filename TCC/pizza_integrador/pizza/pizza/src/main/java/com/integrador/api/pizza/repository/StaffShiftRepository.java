package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.domain.StaffShift;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface StaffShiftRepository extends JpaRepository<StaffShift, Long> {
    List<StaffShift> findTop200ByBranchIdOrderByStartedAtDesc(Long branchId);
    Optional<StaffShift> findFirstByBranchIdAndUserIdAndStatusOrderByStartedAtDesc(Long branchId, Long userId, StaffShift.Status status);
}
