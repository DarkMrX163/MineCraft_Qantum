import { SoundEffects } from '../audio/SoundEffects';
import { ItemType } from '../constants';

export class PlayerStats {
  public maxHealth = 20;
  public health = 20;

  public maxHunger = 20;
  public hunger = 20;

  public maxOxygen = 10;
  public oxygen = 10;

  // Equipped Armor State
  public helmet: number | null = null;
  public chestplate: number | null = null;
  public leggings: number | null = null;

  public isDead = false;
  public damageFlashTimer = 0;
  public screenShakeTimer = 0;

  private regenTimer = 0;
  private hungerDepleteTimer = 0;
  private drownTimer = 0;
  private fallStartHeight = 0;
  private isFalling = false;

  // Active Potion Effects
  public speedPotionTimer = 0;
  public nightVisionTimer = 0;
  public oxygenPotionTimer = 0;

  // Achievements & Quests Tracking
  public completedAchievements = new Set<string>();
  public recentAchievementPopup: { title: string; desc: string } | null = null;
  public achievementTimer = 0;

  public unlockAchievement(id: string, title: string, desc: string) {
    if (this.completedAchievements.has(id)) return;
    this.completedAchievements.add(id);
    this.recentAchievementPopup = { title, desc };
    this.achievementTimer = 4.5;
    SoundEffects.getInstance().playAchievementSound();
  }

  public drinkPotion(itemId: number) {
    if (this.isDead) return;
    if (itemId === ItemType.POTION_HEAL) {
      this.health = Math.min(this.maxHealth, this.health + 8);
      this.unlockAchievement('potion_master', 'Алхимик', 'Выпили сварированное зелье!');
    } else if (itemId === ItemType.POTION_SPEED) {
      this.speedPotionTimer = 45; // 45 seconds speed
      this.unlockAchievement('potion_master', 'Алхимик', 'Выпили сварированное зелье!');
    } else if (itemId === ItemType.POTION_NIGHT_VISION) {
      this.nightVisionTimer = 60; // 60 seconds night vision
      this.unlockAchievement('potion_master', 'Алхимик', 'Выпили сварированное зелье!');
    } else if (itemId === ItemType.POTION_OXYGEN) {
      this.oxygenPotionTimer = 60; // 60 seconds water breathing
      this.unlockAchievement('potion_master', 'Алхимик', 'Выпили сварированное зелье!');
    }
    SoundEffects.getInstance().playPotionSound();
  }

  public getTotalArmorPoints(): number {
    let pts = 0;
    if (this.helmet) {
      pts += this.helmet === ItemType.DIAMOND_HELMET ? 3 : 2;
    }
    if (this.chestplate) {
      pts += this.chestplate === ItemType.DIAMOND_CHESTPLATE ? 8 : 6;
    }
    if (this.leggings) {
      pts += this.leggings === ItemType.DIAMOND_LEGGINGS ? 6 : 4;
    }
    return pts;
  }

  public takeDamage(amount: number) {
    if (this.isDead) return;

    // Apply Armor Damage Reduction
    const armorPts = this.getTotalArmorPoints();
    const reductionRatio = Math.max(0.2, 1 - armorPts * 0.04);
    const finalDamage = Math.max(1, Math.floor(amount * reductionRatio));

    this.health = Math.max(0, this.health - finalDamage);
    this.damageFlashTimer = 0.4;
    this.screenShakeTimer = 0.3;

    SoundEffects.getInstance().playBreakSound('stone');

    if (this.health <= 0) {
      this.isDead = true;
    }
  }

  public equipArmor(itemId: number) {
    if (itemId === ItemType.IRON_HELMET || itemId === ItemType.DIAMOND_HELMET) {
      this.helmet = itemId;
    } else if (itemId === ItemType.IRON_CHESTPLATE || itemId === ItemType.DIAMOND_CHESTPLATE) {
      this.chestplate = itemId;
    } else if (itemId === ItemType.IRON_LEGGINGS || itemId === ItemType.DIAMOND_LEGGINGS) {
      this.leggings = itemId;
    }
    SoundEffects.getInstance().playPlaceSound('stone');
    this.unlockAchievement('knight_armor', 'Рыцарь в доспехах', 'Экипировали элементы брони!');
  }

  public eatFood(hungerRestored = 5) {
    if (this.isDead) return;
    this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestored);
    SoundEffects.getInstance().playPopSound();
  }

  public respawn(spawnY = 25) {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.oxygen = this.maxOxygen;
    this.isDead = false;
    this.damageFlashTimer = 0;
    this.screenShakeTimer = 0;
    this.isFalling = false;
    this.drownTimer = 0;
  }

  public update(
    dt: number,
    currentY: number,
    isGrounded: boolean,
    isMoving: boolean,
    isSubmerged = false
  ) {
    if (this.isDead) return;

    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    if (this.screenShakeTimer > 0) this.screenShakeTimer -= dt;

    if (this.achievementTimer > 0) {
      this.achievementTimer -= dt;
      if (this.achievementTimer <= 0) {
        this.recentAchievementPopup = null;
      }
    }

    // Potion timers
    if (this.speedPotionTimer > 0) this.speedPotionTimer -= dt;
    if (this.nightVisionTimer > 0) this.nightVisionTimer -= dt;
    if (this.oxygenPotionTimer > 0) this.oxygenPotionTimer -= dt;

    // Cave Explorer achievement check
    if (currentY < 10) {
      this.unlockAchievement('cave_explorer', 'Исследователь глубин', 'Спустились в глубокие подземные пещеры!');
    }

    // Water Oxygen & Drowning Mechanics
    if (isSubmerged) {
      // If oxygen potion is active, oxygen doesn't deplete!
      if (this.oxygenPotionTimer <= 0) {
        this.oxygen = Math.max(0, this.oxygen - dt * (10 / 15));
      }

      if (this.oxygen <= 0) {
        this.drownTimer += dt;
        if (this.drownTimer >= 1.2) {
          this.drownTimer = 0;
          this.takeDamage(2); // Drowning damage
          SoundEffects.getInstance().playDrowningSound();
        }
      }
    } else {
      // Refill oxygen rapidly above water
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + dt * 8.0);
      this.drownTimer = 0;
    }

    // Fall damage (only when not submerged/swimming)
    if (!isSubmerged) {
      if (!isGrounded) {
        if (!this.isFalling) {
          this.isFalling = true;
          this.fallStartHeight = currentY;
        }
      } else {
        if (this.isFalling) {
          const fallDistance = this.fallStartHeight - currentY;
          this.isFalling = false;

          if (fallDistance > 4.5) {
            const damage = Math.floor((fallDistance - 4) * 1.5);
            this.takeDamage(damage);
          }
        }
      }
    } else {
      this.isFalling = false;
    }

    // Hunger depletion
    this.hungerDepleteTimer += dt;
    if (this.hungerDepleteTimer > (isMoving ? 8 : 16)) {
      this.hungerDepleteTimer = 0;
      if (this.hunger > 0) {
        this.hunger = Math.max(0, this.hunger - 1);
      } else {
        this.takeDamage(1);
      }
    }

    // Health Regeneration when well fed
    if (this.hunger >= 17 && this.health < this.maxHealth) {
      this.regenTimer += dt;
      if (this.regenTimer > 3.0) {
        this.regenTimer = 0;
        this.health = Math.min(this.maxHealth, this.health + 1);
      }
    } else {
      this.regenTimer = 0;
    }
  }
}
