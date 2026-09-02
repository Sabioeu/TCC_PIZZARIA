package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.Coupon;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByBranchIdAndCodeIgnoreCaseAndActiveTrue(Long branchId, String code);
    List<Coupon> findAllByBranchIdOrderByCodeAsc(Long branchId);
}
