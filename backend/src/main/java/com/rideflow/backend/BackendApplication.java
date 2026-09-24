package com.rideflow.backend;

import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.rideflow.backend.model.Role;
import com.rideflow.backend.model.User;
import com.rideflow.backend.repository.UserRepository;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendApplication.class, args);
	}

	@Bean
	public CommandLineRunner initAdminUser(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			if (!userRepository.existsByEmail("admin@rideflow.test")) {
				User admin = User.builder()
						.name("Operations Administrator")
						.email("admin@rideflow.test")
						.password(passwordEncoder.encode("admin123"))
						.phone("+919999999999")
						.roles(Set.of(Role.ROLE_ADMIN))
						.build();
				userRepository.save(admin);
				System.out.println("✅ Default admin user verified: admin@rideflow.test / admin123");
			}
		};
	}
}
