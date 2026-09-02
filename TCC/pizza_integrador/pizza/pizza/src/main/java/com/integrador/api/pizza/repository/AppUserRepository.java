package com.integrador.api.pizza.repository;
import com.integrador.api.pizza.domain.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByEmailIgnoreCase(String email);
    List<AppUser> findAllByBranchIdOrderByNameAsc(Long branchId);
}
