import { SoundEffects } from '../audio/SoundEffects';
import { ItemType } from '../constants';

export class PlayerStats {
  public maxHealth = 20;
  public health = 20;

  public maxHunger = 20;
  public hunger = 20;

  // Equipped Armor State
  public helmet: number | null = null;
  public chestplate: number | null = null;
  public leggings: number | null = null;

  public isDead = false;
  public damageFlashTimer = 0;
  public screenShakeTimer = 0;

  private regenTimer = 0;
  private hungerDepleteTimer = 0;
  private fallStartHeight = 0;
  private isFalling = false;

  public getTotalArmorPoints(): number {
    let pts = 0;
    if (this.helmet) pts += 3;
    if (this.chestplate) pts += 8;
    if (this.leggings) pts += 5;
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
  }

  public eatFood(hungerRestored = 5) {
    if (this.isDead) return;
    this.hunger = Math.min(this.maxHunger, this.hunger + hungerRestored);
    SoundEffects.getInstance().playPopSound();
  }

  public respawn(spawnY = 25) {
    this.health = this.maxHealth;
    this.hunger = this.maxHunger;
    this.isDead = false;
    this.damageFlashTimer = 0;
    this.screenShakeTimer = 0;
    this.isFalling = false;
  }

  public update(dt: number, currentY: number, isGrounded: boolean, isMoving: boolean) {
    if (this.isDead) return;

    if (this.damageFlashTimer > 0) this.damageFlashTimer -= dt;
    if (this.screenShakeTimer > 0) this.screenShakeTimer -= dt;

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

    this.hungerDepleteTimer += dt;
    if (this.hungerDepleteTimer > (isMoving ? 8 : 16)) {
      this.hungerDepleteTimer = 0;
      if (this.hunger > 0) {
        this.hunger = Math.max(0, this.hunger - 1);
      } else {
        this.takeDamage(1);
      }
    }

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
