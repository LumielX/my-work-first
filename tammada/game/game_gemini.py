import pygame
import math

# Initialize the game engine
pygame.init()

# --- Game Constants ---
WIDTH, HEIGHT = 800, 600
FPS = 60
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 50, 50)
BLUE = (50, 50, 255)
GREEN = (150, 255, 150)

# The coordinates our enemies will follow
PATH = [(100, -50), (100, 300), (600, 300), (600, 650)]

# --- Classes ---
class Enemy:
    def __init__(self):
        self.path_index = 0
        self.x, self.y = PATH[0]
        self.speed = 2
        self.health = 100
        self.active = True

    def move(self):
        # Check if we haven't reached the end of the path
        if self.path_index < len(PATH) - 1:
            target_x, target_y = PATH[self.path_index + 1]
            dx, dy = target_x - self.x, target_y - self.y
            dist = math.hypot(dx, dy)
            
            # If close enough to waypoint, target the next one
            if dist < self.speed:
                self.path_index += 1
            else:
                # Move towards the target
                self.x += (dx / dist) * self.speed
                self.y += (dy / dist) * self.speed
        else:
            self.active = False # Walked off screen

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (int(self.x) - 10, int(self.y) - 10, 20, 20))
        # Basic health bar
        pygame.draw.rect(surface, BLACK, (int(self.x) - 10, int(self.y) - 20, 20, 5))
        pygame.draw.rect(surface, GREEN, (int(self.x) - 10, int(self.y) - 20, int(20 * (self.health/100)), 5))

class Tower:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.range = 150
        self.cooldown = 60 # Frames between shots (1 second at 60 FPS)
        self.current_cooldown = 0

    def update(self, enemies, projectiles):
        if self.current_cooldown > 0:
            self.current_cooldown -= 1
        else:
            # Scan for the first enemy in range
            for enemy in enemies:
                dist = math.hypot(enemy.x - self.x, enemy.y - self.y)
                if dist <= self.range:
                    projectiles.append(Projectile(self.x, self.y, enemy))
                    self.current_cooldown = self.cooldown
                    break # Only shoot one enemy at a time

    def draw(self, surface):
        # Draw tower and its range radius
        pygame.draw.circle(surface, BLUE, (self.x, self.y), 15)
        pygame.draw.circle(surface, BLACK, (self.x, self.y), self.range, 1)

class Projectile:
    def __init__(self, x, y, target):
        self.x = x
        self.y = y
        self.target = target
        self.speed = 7
        self.damage = 35
        self.active = True

    def move(self):
        # If target dies while projectile is in air, destroy projectile
        if not self.target.active:
            self.active = False
            return
            
        dx, dy = self.target.x - self.x, self.target.y - self.y
        dist = math.hypot(dx, dy)
        
        # Collision detection
        if dist < self.speed:
            self.target.health -= self.damage
            if self.target.health <= 0:
                self.target.active = False
            self.active = False
        else:
            self.x += (dx / dist) * self.speed
            self.y += (dy / dist) * self.speed

    def draw(self, surface):
        pygame.draw.circle(surface, BLACK, (int(self.x), int(self.y)), 5)

# --- Main Game Loop ---
def main():
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Python Tower Defense MVP")
    clock = pygame.time.Clock()

    running = True
    enemies = []
    towers = []
    projectiles = []
    spawn_timer = 0
    money = 100

    while running:
        screen.fill(WHITE)

        # 1. Handle Input
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: # Left mouse click
                    mx, my = pygame.mouse.get_pos()
                    if money >= 50:
                        towers.append(Tower(mx, my))
                        money -= 50

        # 2. Spawning Logic
        spawn_timer += 1
        if spawn_timer >= 90: # Spawn enemy every 1.5 seconds
            enemies.append(Enemy())
            spawn_timer = 0

        # 3. Draw Map (The Path)
        if len(PATH) >= 2:
            pygame.draw.lines(screen, GREEN, False, PATH, 40)

        # 4. Update & Draw Towers
        for tower in towers:
            tower.update(enemies, projectiles)
            tower.draw(screen)

        # 5. Update & Draw Enemies
        for enemy in enemies[:]:
            enemy.move()
            enemy.draw(screen)
            if not enemy.active:
                if enemy.health <= 0:
                    money += 15 # Reward for defeating enemy
                enemies.remove(enemy)

        # 6. Update & Draw Projectiles
        for proj in projectiles[:]:
            proj.move()
            proj.draw(screen)
            if not proj.active:
                projectiles.remove(proj)

        # 7. Draw HUD (Money)
        font = pygame.font.SysFont("Arial", 24, bold=True)
        money_text = font.render(f"Funds: ${money} | Click to buy tower ($50)", True, BLACK)
        screen.blit(money_text, (10, 10))

        # Refresh screen and tick clock
        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()
    