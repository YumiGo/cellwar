# cellwar
Project for studying Computer Graphics
# Introduction
![c](https://user-images.githubusercontent.com/47418925/141670988-7bdd7d61-b530-4158-a86e-bac6fbdcca5b.jpg)

Cell war is a web-based game that player becomes an immune cell and destroy cancer cells.  
It has been created as a term project in computer graphics course in Department of Software, Gachon University.

# Description
_Background_:  
Healthy cells stop cell division when there is no longer a need for more daughter cells.  
But cancer cells divide continually and form solid tumors.  
Immune cells that kill the cancer cells include NK cells, T cells, and B cells.

_Motivation_:  
We thought about making the process of the immune cells destroying the cancer cells to a game.


## Development Environment
- WebGL
- Three.js

## Used models for rendering
NK Cell (User)|Blood Cell (Feed)|Cancer Cell (Enemy)
:-------------------------:|:-------------------------:|:-------------------------:
![unnamed1](https://github.com/doding2/cellwar/blob/main/Cell%20War/img_cell.png) | ![unnamed2](https://github.com/doding2/cellwar/blob/main/Cell%20War/img_blood.png) | ![unnamed3](https://github.com/doding2/cellwar/blob/main/Cell%20War/img_cancer.png)

## Game rules
Look at the above pictures.  
In this game, you become a natural killer(NK) cell, which is shown on the left.  
The cancer cell looks like the picture on the right and it starts from one at first in the random place.  
Then, it divides into three when a certain amount of time passes.  
  
In order to destroy the cancer cells, you must be bigger enough than them.  
You can get bigger if you eat the blood cells shown on the middle of the pictures.  
There would be infinite blood cells so get stronger and crash into the cancer cells!  
  
By just one crash, the cancer cell will be destroyed and you will get 10 points per one.

If all of it are destroyed or you score 50 points, you win.  
But if 15 of it occupy the space or you crash into it when you aren't bigger enough, you loose.

## How to play
Moving the mouse, you can control the view.  
By using the keyboard buttons "W", "A", "S", and "D", you can move.  
  
To go forward, press "W".  
To go left, press "A".  
To go back, press "S".  
To go right, press "D".  

# Limitations
We couldn't use the cancer cell model due to the price.  
Instead, we use the model of corona virus which is free.  
Moreover, we didn't implement the actual processes that immune cell attacks cancer cell and cancer cell divides.  
It's been made as a game different from the scientific facts for entertainment.

# Developers
* [김승윤] @awholeneworld: blackjjang12@naver.com
* [고유미] @YumiGo: kumi1224@naver.com
* [오정민] @ojm51: ojm51@naver.com
* [유승준] @doding2: dragon0414@naver.com

# Presentation Video on Youtube
[CLICK HERE](https://youtu.be/oashEO3fT5A)

