const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 800 }, debug: false }
    },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

let player, cursors, healthBar, health = 100;
let zones, items;
let currentZoneText, inventoryText;
let inventory = { hasMask: false, hasCoat: false };

function preload() {
    // Tạo các hình khối đơn giản thay vì load ảnh để bạn chạy được ngay
    this.load.image('ground', 'https://labs.phaser.io/assets/sprites/platform.png');
}

function create() {
    // 1. Tạo mặt đất và các tầng núi
    let platforms = this.physics.add.staticGroup();
    platforms.create(400, 580, 'ground').setScale(2).refreshBody(); // Mặt đất
    platforms.create(600, 400, 'ground'); // Tầng 1
    platforms.create(200, 250, 'ground'); // Tầng 2

    // 2. Tạo người chơi
    player = this.physics.add.sprite(100, 450, 'ground').setDisplaySize(30, 40);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, platforms);

    // 3. Tạo các Vùng (Zones) - Sử dụng hình chữ nhật vô hình
    zones = this.physics.add.staticGroup();
    
    // Vùng Lạnh (Bên phải)
    let coldZone = this.add.rectangle(600, 300, 200, 200, 0x0000ff, 0.3);
    coldZone.name = "Vùng Lạnh";
    zones.add(coldZone);

    // Vùng Độc (Bên trái cao)
    let toxicZone = this.add.rectangle(200, 150, 200, 200, 0x00ff00, 0.3);
    toxicZone.name = "Vùng Độc";
    zones.add(toxicZone);

    // 4. Vật phẩm (Items)
    items = this.physics.add.staticGroup();
    let mask = this.add.circle(50, 500, 10, 0xffff00); // Mặt nạ
    mask.name = "Mask";
    items.add(mask);

    // 5. UI: Thanh máu và Thông tin
    healthBar = this.add.graphics();
    currentZoneText = this.add.text(16, 16, 'Vùng: An toàn', { fontSize: '18px', fill: '#fff' });
    inventoryText = this.add.text(16, 40, 'Túi đồ: Trống', { fontSize: '18px', fill: '#fff' });

    cursors = this.input.keyboard.createCursorKeys();

    // Xử lý nhặt đồ
    this.physics.add.overlap(player, items, (p, item) => {
        if(item.name === "Mask") inventory.hasMask = true;
        inventoryText.setText("Túi đồ: Mặt nạ phòng độc");
        item.destroy();
    });
}

function update() {
    // Điều khiển
    if (cursors.left.isDown) player.setVelocityX(-160);
    else if (cursors.right.isDown) player.setVelocityX(160);
    else player.setVelocityX(0);

    if (cursors.up.isDown && player.body.touching.down) player.setVelocityY(-500);

    // Logic sinh tồn
    let inSpecialZone = false;
    healthBar.clear();
    healthBar.fillStyle(0xff0000, 1);
    healthBar.fillRect(16, 70, health * 2, 20); // Vẽ thanh máu

    // Kiểm tra va chạm với vùng
    this.physics.overlap(player, zones, (p, zone) => {
        inSpecialZone = true;
        currentZoneText.setText("Vùng: " + zone.name);

        if (zone.name === "Vùng Độc" && !inventory.hasMask) {
            health -= 0.2; // Mất máu nhanh nếu không có mặt nạ
        }
        if (zone.name === "Vùng Lạnh") {
            health -= 0.05; // Mất máu từ từ
        }
    });

    if (!inSpecialZone) currentZoneText.setText("Vùng: An toàn");

    if (health <= 0) {
        this.add.text(300, 300, 'GAME OVER', { fontSize: '64px', fill: '#ff0000' });
        this.physics.pause();
    }
}
