// Original court cat. Local +X points toward the nose, +Y toward the ears.
window.VBCatModel = (() => {
  'use strict';
  const T = THREE;
  const up = new T.Vector3(0, 1, 0);
  const fur = 0x171a23, flank = 0x100e11, ink = 0x17151b;
  const coat = new T.MeshLambertMaterial({ vertexColors: true, color: 0xaaaaaa, emissive: 0x06070a });
  const plain = new Map();
  function pigment(color) {
    if (!plain.has(color)) plain.set(color, new T.MeshLambertMaterial({ color: new T.Color(color).multiplyScalar(.56), emissive: new T.Color(color).multiplyScalar(.45) }));
    return plain.get(color);
  }
  function mesh(parent, geometry, mat) {
    const part = new T.Mesh(geometry, mat);
    parent.add(part);
    return part;
  }
  function group(parent) {
    const joint = new T.Group();
    parent.add(joint);
    return joint;
  }
  const sphere = new T.SphereGeometry(1, 16, 10);
  function oval(parent, x, y, z, a, b, c, mat) {
    const part = mesh(parent, sphere, mat);
    part.position.set(x, y, z);
    part.scale.set(a, b, c);
    return part;
  }
  // A closed, rounded ring mesh. Each row supplies a centre, depth and half-width.
  function loft(parent, rows, color = fur, shade = flank) {
    const pos = [], colors = [], indices = [], sides = 24;
    const light = new T.Color(color), dark = new T.Color(shade), mixed = new T.Color();
    for (const [y, x, z, depth, width] of rows) {
      for (let i = 0; i < sides; i++) {
        const a = i * Math.PI * 2 / sides, nx = Math.cos(a), nz = Math.sin(a);
        pos.push(x + depth * nx, y, z + width * nz);
        const blend = T.MathUtils.smoothstep(-nx * .85 - nz * .28, .20, .53);
        mixed.copy(light).lerp(dark, blend);
        colors.push(mixed.r, mixed.g, mixed.b);
      }
    }
    for (let j = 0; j < rows.length - 1; j++) {
      for (let i = 0; i < sides; i++) {
        const a = j * sides + i, b = j * sides + (i + 1) % sides;
        indices.push(a, a+sides, b, b, a+sides, b+sides);
      }
    }
    for (let i = 1; i < sides-1; i++) {
      const end = (rows.length-1)*sides;
      indices.push(0, i, i+1, end, end+i+1, end+i);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(parent, geo, coat);
  }
  function line(parent, points, radius, mat) {
    const path = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    return mesh(parent, new T.TubeGeometry(path, 10, radius, 5, false), mat);
  }
  // A shallow elliptical patch sampled on the skull, including its outer edge.
  const skullDepth = .192, skullHeight = .205, skullWidth = .247;
  function faceX(y, z) {
    return skullDepth * Math.sqrt(Math.max(.001, 1-(y/skullHeight)**2-(z/skullWidth)**2));
  }
  function facePatch(parent, y, z, ry, rz, offset, mat) {
    const verts = [], tri = [], n = 28;
    for (let j = 0; j <= 4; j++) {
      for (let i = 0; i < n; i++) {
        const a = -i*2*Math.PI/n, dy = ry*j/4*Math.sin(a), dz = rz*j/4*Math.cos(a);
        verts.push(faceX(y+dy, z+dz)+offset, dy, dz);
      }
    }
    for (let j=0; j<4; j++) for(let i=0; i<n; i++) {
      const a=j*n+i, b=j*n+(i+1)%n;
      tri.push(a,a+n,b,b,a+n,b+n);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(verts,3)); g.setIndex(tri); g.computeVertexNormals();
    const part = mesh(parent,g,mat); part.position.set(0,y,z); return part;
  }
  function ear(head, side) {
    const joint = group(head);
    joint.position.set(-.018,.105,side*.139);
    // A convex tapered wedge with a rounded tip and a recessed pink face.
    const sections = [
      [-.025,.002,-.035,.042,.043],[0,0,-.011,.061,.069],[.068,-.002,.012,.060,.085],
      [.177,-.008,.035,.040,.061],[.285,-.021,.064,.017,.027],
      [.340,-.025,.073,.003,.005]
    ];
    loft(joint,sections.map(([y,x,z,d,w])=>[side>0?y*.92:y,x,side*z,d,w]));
    // Sample the same wedge profile; a narrow inset margin leaves a dark rim.
    const verts=[], indices=[], columns=11;
    for (const y of [.023,.068,.177,.285,.323]) {
      const i=sections.findIndex(row=>row[0]>=y);
      const lo=sections[i-1], hi=sections[i], f=(y-lo[0])/(hi[0]-lo[0]);
      const at=k=>T.MathUtils.lerp(lo[k],hi[k],f);
      for(let j=0;j<columns;j++){
        const a=(j/(columns-1)-.5)*2.05;
        verts.push(at(1)+at(3)*Math.cos(a)+.0018,side>0?y*.92:y,side*at(2)+at(4)*Math.sin(a));
      }
    }
    for(let j=0;j<4;j++) for(let i=0;i<columns-1;i++){
      const a=j*columns+i;
      indices.push(a,a+columns,a+1,a+1,a+columns,a+columns+1);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));
    g.setIndex(indices);g.computeVertexNormals();mesh(joint,g,pigment(0xa07e82));
    return joint;
  }
  function makeTail(tail) {
    const curve=new T.CatmullRomCurve3([[0,0,0],[-.12,.14,-.025],[-.17,.38,-.07],
      [-.23,.61,-.14],[-.37,.79,-.24],[-.55,.88,-.35],[-.67,.89,-.41]]
      .map(p=>new T.Vector3(...p)));
    const steps=40, sides=12, frames=curve.computeFrenetFrames(steps,false);
    const pos=[],colors=[],tri=[],v=new T.Vector3();
    for(let j=0;j<=steps;j++){
      const t=j/steps, c=curve.getPointAt(t);
      const r=(.074-.031*t)*Math.sqrt(Math.max(0,1-Math.max(0,(t-.95)/.05)**2));
      for(let i=0;i<sides;i++){
        const a=i*2*Math.PI/sides;
        v.copy(c).addScaledVector(frames.normals[j],r*Math.cos(a)).addScaledVector(frames.binormals[j],r*Math.sin(a));
        pos.push(v.x,v.y,v.z);
        const tint=new T.Color(v.y-c.y < -.013 ? flank : fur);
        colors.push(tint.r,tint.g,tint.b);
        if(j<steps){const k=j*sides+i,n=j*sides+(i+1)%sides;tri.push(k,n,k+sides,n,n+sides,k+sides);}
      }
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(tri);g.computeVertexNormals();
    mesh(tail,g,coat);
  }
  function build(parent,P) {
    P.pose=group(parent); P.body=group(P.pose);
    // Torso runs from pelvis (0) to shoulders (1); the neck continues into the skull.
    loft(P.body,[[-.25,0,0,.060,.065],[-.17,-.008,0,.135,.144],[.02,-.014,0,.167,.16],
      [.30,0,0,.151,.148],[.60,.01,0,.116,.124],[.84,.012,0,.100,.114],
      [1,.012,0,.096,.101],[1.18,.01,0,.083,.082],[1.28,.014,0,.065,.066]]);
    P.head=group(P.pose);
    const skull=mesh(P.head,new T.SphereGeometry(1,32,24),coat);
    skull.scale.set(skullDepth,skullHeight,skullWidth);
    skull.name='skull';
    const normals=skull.geometry.attributes.normal, colors=[];
    const light=new T.Color(fur), dark=new T.Color(flank), shade=new T.Color();
    for(let i=0;i<normals.count;i++){
      const back=-normals.getX(i)-.24*normals.getZ(i);
      shade.copy(light).lerp(dark,T.MathUtils.smoothstep(back,.05,.35));
      colors.push(shade.r,shade.g,shade.b);
    }
    skull.geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
    P.ears=[ear(P.head,1),ear(P.head,-1)];
    P.eyes=[];P.closedEyes=[];
    for(const side of [1,-1]){
      const z=side*(side>0?.101:.106), y=side>0?.042:.046;
      const ry=side>0?.069:.077, rz=side>0?.064:.076;
      const eye=group(P.head);
      facePatch(eye,y,z,ry,rz,.0018,pigment(ink));
      facePatch(eye,y,z,ry-.003,rz-.003,.0033,pigment(0xfffaf3));
      facePatch(eye,y+.003,z+.008,.034,.016,.0053,pigment(0x100f13));
      P.eyes.push(eye);
      const lid=[-.8,0,.8].map(t=>{const zz=z+t*rz, yy=y-.006*(1-t*t);return [faceX(yy,zz)+.004,yy,zz];});
      P.closedEyes.push(line(P.head,lid,.0026,pigment(ink)));
      for(let i=0;i<3;i++){
        const yy=-.024-i*.016, zz=side*.169;
        line(P.head,[[faceX(yy,zz)+.002,yy,zz],[.151,yy+.004-i*.003,side*.235],
          [.137-i*.004,yy+.015-i*.014,side*(.307-i*.008)]],.0021,pigment(ink));
      }
    }
    loft(P.head,[[-.015,.194,0,.003,.003],[-.003,.197,0,.009,.020],
      [.004,.196,0,.008,.022],[.009,.193,0,.004,.012]],0xc79095,0xa8747c);
    for(const s of [-1,1])line(P.head,[[.195,-.015,0],[.194,-.025,s*.008],[.191,-.039,s*.021]],.0027,pigment(ink));
    P.mouth=oval(P.head,.193,-.035,0,.004,.018,.015,pigment(0x673d48));
    P.hat=group(P.head);
    const cone=mesh(P.hat,new T.ConeGeometry(.09,.22,8),pigment(0xe0a176));
    cone.position.y=.30;oval(P.hat,0,.42,0,.030,.030,.030,pigment(0xffffff));P.hat.visible=false;
    P.legs=[];P.paws=[];
    for(let i=0;i<4;i++){
      const front=i<2, leg=group(P.pose);
      const sections=front?[[0,.028],[.16,.034],[.48,.046],[.77,.054],[.88,.053],[.96,.038],[1,.012]]:
        [[0,.039],[.17,.055],[.38,.083],[.62,.099],[.80,.096],[.94,.072],[1,.048]];
      loft(leg,sections.map(([y,r])=>[y,front?-.014*Math.sin(y*Math.PI):-.025*Math.sin(y*Math.PI),0,r*(front?.91:1.10),r]));
      P.legs.push(leg);
      P.paws.push(oval(P.pose,0,0,0,front?.057:.071,.031,.043,pigment(front?fur:flank)));
    }
    P.tail=group(P.pose);makeTail(P.tail);
    P.blend={walk:0,stride:0,sleep:1,eye:0,party:0,stretch:0};
    pose(P,{sleeping:true,walking:false,party:false,closed:true,act:'',s:0},0,1);
  }
  const hip=new T.Vector3(),shoulder=new T.Vector3(),ankle=new T.Vector3(),socket=new T.Vector3(),axis=new T.Vector3();
  function pose(P,{sleeping,walking,standing=false,party,closed,act,s},time,dt){
    const k=P.blend, mix=1-Math.exp(-7*dt);
    k.walk+=((walking||standing?1:0)-k.walk)*mix;k.sleep+=((sleeping?1:0)-k.sleep)*mix;
    k.party+=((party?1:0)-k.party)*mix;k.stretch+=((act==='stretch'?s:0)-k.stretch)*mix;
    k.eye+=((closed?0:1)-k.eye)*(1-Math.exp(-32*dt));
    k.stride+=((walking?1:0)-k.stride)*mix;
    const w=k.walk, sl=k.sleep, st=k.stretch, stride=k.stride;
    hip.set(-.15-.09*w,.235+.23*w+.21*st-.085*sl,0);
    shoulder.set(.045+.26*w+.34*st+.13*sl,.765-.26*w-.50*st-.54*sl,0);
    axis.subVectors(shoulder,hip);
    P.body.position.copy(hip);P.body.scale.y=axis.length();P.body.quaternion.setFromUnitVectors(up,axis.normalize());
    P.head.position.copy(shoulder).addScaledVector(axis,.115);
    P.head.position.x+=.023+.057*w+.030*st;P.head.position.y+=.072-.023*sl;
    P.head.rotation.set(0,.16*Math.sin(time*.72)*(1-sl),-.25*sl+.19*k.party+(act==='yawn'?.19*s:0)+(act==='meow'?.055*s:0));
    P.mouth.scale.y=.018*(act==='yawn'?s:act==='meow'?.6*s*Math.abs(Math.sin(time*14)):0);
    P.mouth.visible=P.mouth.scale.y>.001;
    P.eyes.forEach((e,i)=>{
      e.visible=k.eye>.12;e.scale.y=Math.max(.12,k.eye);
      e.position.y=.044*(1-e.scale.y);P.closedEyes[i].visible=k.eye<.42;
    });
    for(let i=0;i<4;i++){
      const front=i<2, side=i%2===0?1:-1, phase=time*7+(i===1||i===2?Math.PI:0);
      socket.copy(front?shoulder:hip);
      socket.x+=front?-.008:-.024;socket.y+=front?-.065:.095;socket.z=side*(front?.063:.081);
      ankle.set((front?.104:-.15)+(front?.22:-.12)*w+(front?.42:0)*st+
        (front?.12:.07)*sl+.122*Math.sin(phase)*stride,
        .031+.062*Math.max(0,Math.cos(phase))*stride,side*(front?.077:.098));
      const leg=P.legs[i];axis.subVectors(socket,ankle);leg.position.copy(ankle);
      leg.scale.y=axis.length();leg.quaternion.setFromUnitVectors(up,axis.normalize());
      P.paws[i].position.copy(ankle);P.paws[i].position.x+=front?.021:.030;
    }
    P.tail.position.copy(hip);P.tail.position.x-=.066;P.tail.position.y+=.038;
    P.tail.rotation.z=.83*sl+.27*w+.20*st;
    P.tail.rotation.y=1.45*sl+.10*Math.sin(time*1.5)+(party?.24:act==='tail'?.34*s:0)*Math.sin(time*6);
    P.ears.forEach((e,i)=>{e.rotation.x=(act==='ears'?.20*s*Math.sin(time*16+i):0)+(i?1:-1)*.12*sl;});
    P.hat.visible=party;
  }
  return {build,pose};
})();
