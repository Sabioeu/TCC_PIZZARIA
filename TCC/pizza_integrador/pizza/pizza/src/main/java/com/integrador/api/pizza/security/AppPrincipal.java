package com.integrador.api.pizza.security;

import com.integrador.api.pizza.domain.AppUser;

public record AppPrincipal(Long id, Long branchId, String name, String email, AppUser.Role role) { }
