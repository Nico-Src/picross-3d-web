(async()=>{
    const BLOCK_STATE = {
        DESTROYABLE: 0,
        NON_DESTROYABLE: 1,
    };

    const BLOCK_SIDE = {
        RIGHT: 0,
        LEFT: 1,
        TOP: 2, 
        BOTTOM: 3,
        FRONT: 4,
        BACK: 5
    };

    const loadedTextures = [];

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const gridOffset = 0.5;

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    // set scene background
    const textureLoader = new THREE.TextureLoader();
    scene.background = textureLoader.load('img/backgrounds/1.jpg');

    // load level
    const level = await readLevelFile('levels/level1.lvl');
    console.log(level)

    // place blocks after level loaded
    for(let x = 0; x < level.size[0]; x++){
        for(let y = 0; y < level.size[1]; y++){
            for(let z = 0; z < level.size[2]; z++){
                // layer, z, x
                placeBlock(x,y,z);
            }
        }
    }

    // lighting
    var ambientLight = new THREE.AmbientLight( 'white', 0.75 );
        scene.add( ambientLight );

    var light = new THREE.DirectionalLight( 'white', 0.5 );
        light.position.set( 1, 1, 1 );
        scene.add( light );

    // init orbit controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    // disable everything besides rotating with mouse left button
    controls.mouseButtons = {
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: '',
        RIGHT: ''
    };

    camera.position.y = 5;

    const size = 10;
    const divisions = 10;

    // init grid
    const gridHelper = new THREE.GridHelper(size, divisions, new THREE.Color(0xFFFFFF), new THREE.Color(0xAAAAAA));
    gridHelper.position.x = Math.floor(level.size[0] / 2);
    gridHelper.position.z = Math.floor(level.size[2] / 2);
    // should be raycast
    gridHelper.disableRaycast = true;
    controls.target = gridHelper.position;
    scene.add(gridHelper);

    // render loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render( scene, camera );
    }

    animate();

    // load a level with the given path
    function readLevelFile(path){
        return new Promise((resolve,reject)=>{
            fetch(path).then((res) => res.text())
            .then((text) => {
                const level = {};
                // read line by line
                let lines = text.split('\n');
                console.log(lines)
                // first line is the size of the level (x y z)
                level.size = lines[0].split(' ').map((val)=>parseInt(val));
                // initialize block and hint map
                level.blockMap = initialize3DArray(level.size[0], level.size[1], level.size[2]);
                level.hintMap = initialize3DArray(level.size[0], level.size[1], level.size[2]);
                
                // go through each line and set the block states
                let index = 1;
                let layer = 0;
                while(index < lines.length){
                    for(let c = 0; c < lines[index].length - 1; c++){
                        // layer, z, x
                        level.blockMap[layer][(index-1) % level.size[2]][c] = parseInt(lines[index][c]);
                    }
                    index++;
                    // theres no space between lines so after each "n"-lines increase layer
                    if((index-1) % level.size[1] === 0) layer++;
                }

                // calculate hints for the given blocks
                for(let x = 0; x < level.size[0]; x++){
                    for(let y = 0; y < level.size[1]; y++){
                        for(let z = 0; z < level.size[2]; z++){
                            let vertical = 0;
                            let verticalGroups = 0; // Counter for the number of groups
                            let inGroup = false;  // Flag to track if we are currently in a group of 1s

                            for (let y1 = 0; y1 < level.size[1]; y1++) {
                                if (level.blockMap[y1][z][x] === BLOCK_STATE.NON_DESTROYABLE) {
                                    vertical++;
                                    // Found a block with value 1
                                    if (!inGroup) {
                                        // If not already in a group, start a new group
                                        inGroup = true;
                                        verticalGroups++;
                                    }
                                } else {
                                    // Found a block with value other than 1
                                    inGroup = false; // Mark the end of the current group
                                }
                            }

                            // TODO: Other groups counters

                            inGroup = false;
                            let horizontalRightLeft = 0;
                            let horizontalRightLeftGroups = 0;
                            for(let x1 = 0; x1 < level.size[0]; x1++){
                                if(level.blockMap[y][z][x1] === BLOCK_STATE.NON_DESTROYABLE) horizontalRightLeft++;
                            }

                            inGroup = false;
                            let horizontalBackFront = 0;
                            let horizontalBackFrontGroups = 0;
                            for(let z1 = 0; z1 < level.size[2]; z1++){
                                if(level.blockMap[y][z1][x] === BLOCK_STATE.NON_DESTROYABLE) horizontalBackFront++;
                            }

                            // set hints
                            level.hintMap[y][z][x] = {
                                vertical, 
                                verticalType: verticalGroups <= 1 ? 'single' : verticalGroups === 2 ? 'two' : 'three',
                                horizontalBackFront, 
                                horizontalBackFrontType: horizontalBackFrontGroups <= 1 ? 'single' : horizontalBackFrontGroups === 2 ? 'two' : 'three',
                                horizontalRightLeft,
                                horizontalRightLeftType: horizontalRightLeftGroups <= 1 ? 'single' : horizontalRightLeftGroups === 2 ? 'two' : 'three',
                            };
                        }
                    }
                }
                resolve(level);
            }).catch((e) => console.error(e));
        });
    }
    
    // initialize 3d array with given dimensions (x y z)
    function initialize3DArray(x, y, z) {
        let array3D = new Array(x);
    
        for (let i = 0; i < x; i++) {
            array3D[i] = new Array(y);
            for (let j = 0; j < y; j++) array3D[i][j] = new Array(z).fill(0); // You can initialize the values with any default value
        }
    
        return array3D;
    }
    
    // add resize listener
    window.addEventListener('resize', onWindowResize, false);
    
    // resize and update camera and renderer when window resizes
    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    // add mouse down event listener
    document.addEventListener('mousedown', onDocumentMouseDown);

    // click handler
    function onDocumentMouseDown(event) {
        event.preventDefault();
        // nothing on left click
        if(event.button === 0) return;

        // calc 3d mouse vector
        const mouse3D = new THREE.Vector3(( event.clientX / window.innerWidth ) * 2 - 1,   
                                        -( event.clientY / window.innerHeight ) * 2 + 1,  
                                        0.5);     

        // create raycaster from mouse and camera
        const raycaster =  new THREE.Raycaster();                                        
        raycaster.setFromCamera(mouse3D, camera);
        // check if raycaster intersects with any objects (apart from objects that have raycast disabled)
        const intersects = raycaster.intersectObjects(scene.children.filter(c => !c.disableRaycast));

        if(intersects.length > 0){
            if(event.button === 2 && event.altKey){
                // layer, z, x
                const obj = intersects[0].object;
                // get position of clicked block
                const x = Math.floor(obj.position.x);
                const y = Math.floor(obj.position.y);
                const z = Math.floor(obj.position.z);
                const blockState = level.blockMap[y][z][x];
                // if block is non destroyable, mark it and reduce players life
                if(blockState === BLOCK_STATE.NON_DESTROYABLE){
                    for(const mat of obj.material){
                        mat.color.setHex(0x1c55a0);
                    }
                    // TODO: reduce players life
                    return;
                }
                // destroy block and dispose materials and geometry to not leak any memory
                obj.geometry.dispose();
                obj.material.forEach((mat)=>{
                    mat.dispose();
                });
                scene.remove(obj);
            // right click without alt key
            } else if(event.button === 2){
                // get materials
                const materials = intersects[0].object.material;
                for(const mat of materials){
                    const curCol = mat.color;
                    // if cube is already marked reset
                    if(curCol.r === 0.10980392156862745 && curCol.g === 0.3333333333333333 && curCol.b === 0.6274509803921569) mat.color.setHex(0xFFFFFF);
                    // else mark it
                    else mat.color.setHex(0x1c55a0);
                }
            }
        }
    }
    
    // place a block at a specific position
    function placeBlock(x,y,z){
        // get hints for that position
        const hints = level.hintMap[y][z][x];
        
        // right, left, top, bottom, front, back
        const urls = [
            `img/block${hints.horizontalRightLeft}_${hints.horizontalRightLeftType}.png`, `img/block${hints.horizontalRightLeft}_${hints.horizontalRightLeftType}.png`,
            `img/block${hints.vertical}_${hints.verticalType}.png`, `img/block${hints.vertical}_${hints.verticalType}.png`,
            `img/block${hints.horizontalBackFront}_${hints.horizontalBackFrontType}.png`,`img/block${hints.horizontalBackFront}_${hints.horizontalBackFrontType}.png`
        ];
                    
        // load textures
        const materials = urls.map(url => {
            const tex = loadTexture(url);
            tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            const mat = new THREE.MeshPhongMaterial({ map: tex });
            mat.specular = new THREE.Color(0x000000);
            mat.map.minFilter = mat.map.maxFilter = THREE.LinearFilter;
            return mat;
        });

        // create box and set position
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const block = new THREE.Mesh(geometry, materials);
        block.position.x = x + gridOffset;
        block.position.y = y + gridOffset;
        block.position.z = z + gridOffset;
        scene.add(block);
    }

    // loads texture or if already loaded returns the loaded texture
    function loadTexture(path){
        // check if loadedTextures array already contains the requested texture
        if(loadedTextures.filter(t => t.path === path).length > 0){
            return loadedTextures.find(t => t.path === path).tex;
        // else load it and add it to the loadedTextures array
        } else {
            const tex = textureLoader.load(path);
            loadedTextures.push({path: path, tex: tex});
            return tex;
        }
    }
})();