const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false } // Bật debug: true để thấy các box va chạm
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let healthBar, staminaBar;
let health = 100, stamina = 100;
let currentZoneText, inventoryText;
let inventory = { hasMask: false, hasCoat: false, hasBoots: false }; // Thêm hasBoots cho vùng trơn
let gameOver = false;

// Tốc độ di chuyển và nhảy
const PLAYER_SPEED = 180;
const JUMP_VELOCITY = -500;

function preload() {
    // === Vui lòng thay thế các URL này bằng đường dẫn đến file ảnh của bạn ===
    this.load.image('background', 'https://i.imgur.com/your_background_image.png'); // Nền núi chung
    this.load.image('player_idle', 'https://i.imgur.com/your_player_idle.png'); // Ảnh nhân vật đứng yên
    this.load.image('platform', 'https://i.imgur.com/your_platform.png'); // Nền đất thường
    this.load.image('slippery_ice', 'https://i.imgur.com/your_slippery_ice.png'); // Nền băng trơn
    this.load.image('toxic_gas_effect', 'https://i.imgur.com/your_toxic_gas_effect.png'); // Hiệu ứng khí độc (có thể là một sprite nhỏ)
    this.load.image('item_mask', 'https://i.imgur.com/your_item_mask.png'); // Vật phẩm mặt nạ
    this.load.image('item_coat', 'https://i.imgur.com/your_item_coat.png'); // Vật phẩm áo ấm
    this.load.image('item_boots', 'https://i.imgur.com/your_item_boots.png'); // Vật phẩm giày chống trượt

    // Tạo hình ảnh giả định nếu không load được từ URL (chỉ để chạy thử)
    // Nếu bạn có file ảnh thật, hãy bỏ qua phần này
    if (!this.textures.exists('background')) this.load.image('background', 'https://via.placeholder.com/800x600/34495e/ffffff?text=Background');
    if (!this.textures.exists('player_idle')) this.load.image('player_idle', 'https://via.placeholder.com/40x60/f1c40f/ffffff?text=P');
    if (!this.textures.exists('platform')) this.load.image('platform', 'https://via.placeholder.com/100x20/7f8c8d/ffffff?text=Platform');
    if (!this.textures.exists('slippery_ice')) this.load.image('slippery_ice', 'https://via.placeholder.com/100x20/bdc3c7/ffffff?text=Ice');
    if (!this.textures.exists('item_mask')) this.load.image('item_mask', 'https://via.placeholder.com/20x20/2ecc71/ffffff?text=M');
    if (!this.textures.exists('item_coat')) this.load.image('item_coat', 'https://via.placeholder.com/20x20/3498db/ffffff?text=C');
    if (!this.textures.exists('item_boots')) this.load.image('item_boots', 'https://via.placeholder.com/20x20/9b59b6/ffffff?text=B');
}

function create() {
    // Thêm nền
    this.add.image(400, 300, 'background').setDisplaySize(800, 600);

    // 1. Tạo các nền tảng (platforms)
    let platforms = this.physics.add.staticGroup();
    platforms.create(400, 580, 'platform').setScale(4, 1).refreshBody(); // Mặt đất rộng
    platforms.create(600, 400, 'platform'); // Tầng 1
    platforms.create(200, 250, 'platform'); // Tầng 2

    // Vùng trơn trượt (Slippery Zone)
    let slipperyPlatforms = this.physics.add.staticGroup();
    slipperyPlatforms.create(450, 100, 'slippery_ice'); // Nền băng trơn
    slipperyPlatforms.create(150, 450, 'slippery_ice'); // Nền băng trơn

    // 2. Tạo người chơi
    player = this.physics.add.sprite(100, 450, 'player_idle');
    player.setCollideWorldBounds(true);
    player.setScale(1); // Điều chỉnh kích thước nhân vật nếu cần

    // Thêm va chạm cho người chơi với các loại nền
    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, slipperyPlatforms, handleSlipperyPlatform);

    // 3. Tạo các Vùng (Zones) - Sử dụng hình chữ nhật vô hình
    let zones = this.add.group(); // Sử dụng group thường thay vì staticGroup cho vùng
    
    // Vùng Lạnh (Bên phải - tuyết rơi)
    let coldZone = this.add.rectangle(600, 300, 200, 200, 0x0000ff, 0.2); // Màu xanh dương nhạt
    coldZone.name = "Vùng Lạnh";
    zones.add(coldZone);

    // Vùng Độc (Bên trái cao - sương mù)
    let toxicZone = this.add.rectangle(200, 150, 200, 200, 0x00ff00, 0.2); // Màu xanh lá nhạt
    toxicZone.name = "Vùng Độc";
    zones.add(toxicZone);

    // Vùng Khô Hạn (Dưới cùng bên trái - màu nâu cam)
    let dryZone = this.add.rectangle(200, 500, 200, 100, 0xd35400, 0.2);
    dryZone.name = "Vùng Khô Hạn";
    zones.add(dryZone);

    // 4. Vật phẩm (Items)
    let items = this.physics.add.staticGroup();
    items.create(50, 500, 'item_mask').setScale(1); // Mặt nạ
    items.create(700, 50, 'item_coat').setScale(1); // Áo ấm
    items.create(300, 100, 'item_boots').setScale(1); // Giày chống trượt

    // 5. UI: Thanh máu, Thanh thể lực và Thông tin
    this.add.text(16, 16, 'Máu:', { fontSize: '18px', fill: '#fff' });
    healthBar = this.add.graphics();
    drawHealthBar();

    this.add.text(16, 40, 'Thể Lực:', { fontSize: '18px', fill: '#fff' });
    staminaBar = this.add.graphics();
    drawStaminaBar();

    currentZoneText = this.add.text(16, 70, 'Vùng: An toàn', { fontSize: '18px', fill: '#fff' });
    inventoryText = this.add.text(16, 95, 'Túi đồ: Trống', { fontSize: '18px', fill: '#fff' });

    cursors = this.input.keyboard.createCursorKeys();

    // === Thêm Nút điều khiển ảo cho điện thoại ===
    // Nút trái
    let leftBtn = this.add.circle(60, 530, 40, 0x34495e, 0.7).setScrollFactor(0).setInteractive();
    this.add.text(40, 520, "<", { fontSize: '32px', fill: '#fff' }).setScrollFactor(0);
    leftBtn.on('pointerdown', () => { player.moveLeft = true; });
    leftBtn.on('pointerup', () => { player.moveLeft = false; });
    leftBtn.on('pointerout', () => { player.moveLeft = false; });

    // Nút phải
    let rightBtn = this.add.circle(150, 530, 40, 0x34495e, 0.7).setScrollFactor(0).setInteractive();
    this.add.text(130, 520, ">", { fontSize: '32px', fill: '#fff' }).setScrollFactor(0);
    rightBtn.on('pointerdown', () => { player.moveRight = true; });
    rightBtn.on('pointerup', () => { player.moveRight = false; });
    rightBtn.on('pointerout', () => { player.moveRight = false; });

    // Nút nhảy
    let jumpBtn = this.add.circle(740, 530, 50, 0x27ae60, 0.7).setScrollFactor(0).setInteractive();
    this.add.text(720, 510, "^", { fontSize: '48px', fill: '#fff', fontWeight: 'bold' }).setScrollFactor(0);
    jumpBtn.on('pointerdown', () => { 
        if (player.body.touching.down) {
            player.setVelocityY(JUMP_VELOCITY); 
            stamina -= 5; // Nhảy tốn thể lực
            if (stamina < 0) stamina = 0;
            drawStaminaBar();
        }
    });
    // ===========================================

    // Xử lý nhặt đồ
    this.physics.add.overlap(player, items, (p, item) => {
        let itemPickedUp = false;
        if(item.texture.key === 'item_mask') { inventory.hasMask = true; itemPickedUp = true; }
        else if(item.texture.key === 'item_coat') { inventory.hasCoat = true; itemPickedUp = true; }
        else if(item.texture.key === 'item_boots') { inventory.hasBoots = true; itemPickedUp = true; }
        
        if (itemPickedUp) {
            updateInventoryText();
            item.destroy(); // Xóa vật phẩm khỏi màn hình
        }
    });

    // Xử lý va chạm với vùng môi trường
    this.physics.add.overlap(player, zones, (p, zone) => {
        handleZoneEffect(zone);
    });

    // Thêm hiệu ứng khí độc (nếu cần)
    // toxicEffect = this.add.sprite(toxicZone.x, toxicZone.y, 'toxic_gas_effect');
    // toxicEffect.setAlpha(0.5).setVisible(false); // Ban đầu ẩn đi
}

function update() {
    if (gameOver) return; // Dừng mọi hoạt động khi game over

    // --- Cập nhật điều khiển ---
    if (cursors.left.isDown || player.moveLeft) {
        player.setVelocityX(-PLAYER_SPEED);
    } else if (cursors.right.isDown || player.moveRight) {
        player.setVelocityX(PLAYER_SPEED);
    } else {
        player.setVelocityX(0);
    }

    if (cursors.up.isDown && player.body.touching.down) {
        player.setVelocityY(JUMP_VELOCITY);
        stamina -= 5;
        if (stamina < 0) stamina = 0;
        drawStaminaBar();
    }
    // --- Hết cập nhật điều khiển ---

    // --- Logic sinh tồn ---
    // Kiểm tra xem người chơi có đang ở trong vùng nào không
    let inSpecialZone = false;
    this.physics.overlap(player, this.add.group(this.children.list.filter(c => c.name && c.name.startsWith('Vùng'))), (p, zone) => {
        inSpecialZone = true;
        handleZoneEffect(zone);
    });

    if (!inSpecialZone) {
        currentZoneText.setText("Vùng: An toàn");
        // Hồi phục stamina từ từ khi an toàn
        stamina += 0.1;
        if (stamina > 100) stamina = 100;
        drawStaminaBar();
    }

    // Kiểm tra chết
    if (health <= 0) {
        endGame('Bạn đã chết vì kiệt sức hoặc môi trường khắc nghiệt\!');
    } else if (stamina <= 0 && player.body.touching.down === false) { // Nếu hết thể lực khi đang trên không
        health -= 0.1; // Mất máu nhanh hơn khi kiệt sức và không đứng trên nền
    }
    drawHealthBar(); // Cập nhật thanh máu sau khi xử lý zone
    // --- Hết logic sinh tồn ---
}

// === Các hàm hỗ trợ ===
function drawHealthBar() {
    healthBar.clear();
    healthBar.fillStyle(0xff0000, 1); // Màu đỏ
    healthBar.fillRect(80, 20, health * 1.5, 15); // Chiều dài thanh máu tỉ lệ với health
}

function drawStaminaBar() {
    staminaBar.clear();
    staminaBar.fillStyle(0x00ff00, 1); // Màu xanh lá
    staminaBar.fillRect(80, 44, stamina * 1.5, 15);
}

function updateInventoryText() {
    let itemsInInventory = [];
    if (inventory.hasMask) itemsInInventory.push("Mặt nạ");
    if (inventory.hasCoat) itemsInInventory.push("Áo ấm");
    if (inventory.hasBoots) itemsInInventory.push("Giày");
    inventoryText.setText("Túi đồ: " + (itemsInInventory.length > 0 ? itemsInInventory.join(", ") : "Trống"));
}

function handleZoneEffect(zone) {
    currentZoneText.setText("Vùng: " + zone.name);

    switch (zone.name) {
        case "Vùng Độc":
            if (!inventory.hasMask) {
                health -= 0.3; // Mất máu nhanh
                stamina -= 0.2; // Giảm thể lực
            } else {
                health -= 0.05; // Mất ít máu hơn nếu có mặt nạ
            }
            break;
        case "Vùng Lạnh":
            if (!inventory.hasCoat) {
                health -= 0.1; // Mất máu
                stamina -= 0.1; // Giảm thể lực
            } else {
                stamina += 0.05; // Hồi phục thể lực nếu có áo ấm
                if (stamina > 100) stamina = 100;
            }
            break;
        case "Vùng Khô Hạn":
            stamina -= 0.2; // Mất thể lực do khát
            if (stamina < 20) { // Nếu thể lực quá thấp ở vùng khô
                health -= 0.1; // Mất máu
            }
            break;
        // Thêm các vùng khác ở đây
    }

    if (health < 0) health = 0;
    if (stamina < 0) stamina = 0;
    drawHealthBar();
    drawStaminaBar();
}

function handleSlipperyPlatform(player, platform) {
    if (player.body.touching.down) {
        if (!inventory.hasBoots) {
            // Đẩy người chơi nhẹ nhàng sang một bên
            if (player.body.velocity.x === 0) { // Nếu đang đứng yên
                player.setVelocityX(Phaser.Math.RND.between(-50, 50)); // Đẩy ngẫu nhiên
            } else {
                player.setVelocityX(player.body.velocity.x * 0.95); // Giảm dần tốc độ nhưng có quán tính
            }
            stamina -= 0.05; // Tốn thể lực để giữ thăng bằng
        } else {
            // Có giày chống trượt thì không bị trượt hoặc ít trượt hơn
            // player.setVelocityX(player.body.velocity.x * 0.98); // Vẫn giảm tốc độ nhưng ít hơn
        }
    }
}

function endGame(message) {
    gameOver = true;
    player.setVelocity(0);
    player.setAcceleration(0);
    game.physics.pause();

    // Hiển thị màn hình GAME OVER
    let gameOverText = this.add.text(config.width / 2, config.height / 2 - 50, 'GAME OVER', {
        fontSize: '72px',
        fill: '#ff0000',
        fontWeight: 'bold'
    }).setOrigin(0.5);

    let reasonText = this.add.text(config.width / 2, config.height / 2 + 20, message, {
        fontSize: '24px',
        fill: '#fff'
    }).setOrigin(0.5);

    let restartText = this.add.text(config.width / 2, config.height / 2 + 80, 'Nhấn R để chơi lại', {
        fontSize: '24px',
        fill: '#fff'
    }).setOrigin(0.5).setInteractive();

    restartText.on('pointerdown', () => {
        // Tải lại scene hiện tại
        health = 100;
        stamina = 100;
        inventory = { hasMask: false, hasCoat: false, hasBoots: false };
        gameOver = false;
        this.scene.restart();
    });

    // Thêm phím 'R' để restart
    this.input.keyboard.on('keydown-R', () => {
        health = 100;
        stamina = 100;
        inventory = { hasMask: false, hasCoat: false, hasBoots: false };
        gameOver = false;
        this.scene.restart();
    });
}
