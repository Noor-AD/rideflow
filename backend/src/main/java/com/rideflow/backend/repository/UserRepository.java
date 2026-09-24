package com.rideflow.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rideflow.backend.model.User;

// 1. findByEmail(String email)
public interface UserRepository extends  JpaRepository<User, Long>{
    Optional<User> findByEmail(String email);
    // 2. existsByEmail(String email)
    boolean existsByEmail(String email);
    // 3. existsByPhone(String phone)
    boolean existsByPhone(String phone);
    // 4. findByPhone(String phone)
    Optional<User> findByPhone(String phone);
}



