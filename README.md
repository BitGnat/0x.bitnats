# bitnats

**⦻** the rarest digital artifacts **⦻**

# validating bitnats

**SQL**

run `scripts/valid-bitnats.sql` on bitcoin & ord datasets to ouput valid-bitnats.csv

**ruleset**

1️⃣ `block_height.bitnats`(text/plain)
    at
    Ordinal Inscription Output 0 
        where
        id = `<revealtransaction>i0`

    ➥ (first inscription on sat)

2️⃣ `inscription_block` > `claimed_block`  

    ➥ (previously mined blocks only)

3️⃣ `minimum[inscription_number]` 

    ➥ (first-inscription-is-first)

1️⃣ + 2️⃣ + 3️⃣ = ✅ Valid

# stats

| trait | valids | supply | % minted | rarity |
|-------| -------| -------| -------- | ------- |
| 0x08 | 13865 | 47419 | 29.2% | 5.4% |
| 0x09 | 4375 | 20178 | 21.7% | 2.3% |
| 0x10 | 4882 | 17377 | 28.1% | 2.0% |
| 0x11 | 2979 | 20715 | 14.4% | 2.4% |
| 0x12 | 4301 | 21694 | 19.8% | 2.5% |
| 0x13 | 11811 | 93292 | 12.7% | 10.7% |
| 0x14 | 6940 | 36098 | 19.2% | 4.1% |
| 0x15 | 4556 | 23966 | 19.0% | 2.7% |
| 0x16 | 9411 | 53307 | 17.7% | 6.1% |
| 0x17 | 20019 | 115939 | 17.3% | 13.2% |
| 0x18 | 24606 | 119830 | 20.5% | 13.7% |
| 0x19 | 88643 | 264542 | 33.5% | 30.2% |
| 0x20 | 25838 | 38937 | 66.4% | 4.4% |
| 0x21 | 1793 | 2441 | 73.5% | 0.28% |
| 0x22 | 146 | 147 | 99.3% | 0.017% |
| 0x23 | 6 | 6 | 100.0% | 0.0007% |
| 0x24 | 2 | 2 | 100.0% | 0.0002% |
| **total** | **224173** | **875890** | **25.6%** | - |

# traits

block_hash `0x00000000...` = **0x08**

## 0⦻8

![0⦻8](images/08.svg)

block_hash `0x000000000...` = **0x09** 

## 0⦻9

![0⦻9](images/09.svg)

block_hash `0x0000000000...` = **0x10** 

## 1⦻0

![1⦻0](images/10.svg)

block_hash `0x00000000000...` = **0x11** 

## 1⦻1

![1⦻1](images/11.svg)

block_hash `0x000000000000...` = **0x12** 

## 1⦻2

![1⦻2](images/12.svg)

block_hash `0x0000000000000...` = **0x13** 

## 1⦻3

![1⦻3](images/13.svg)

block_hash `0x00000000000000...` = **0x14** 

## 1⦻4

![1⦻4](images/14.svg)

block_hash `0x000000000000000...` = **0x15** 

## 1⦻5

![1⦻5](images/15.svg)

block_hash `0x0000000000000000...` = **0x16** 

## 1⦻6

![1⦻6](images/16.svg)

block_hash `0x00000000000000000...` = **0x17** 

## 1⦻7

![1⦻7](images/17.svg)

block_hash `0x000000000000000000...` = **0x18** 

## 1⦻8

![1⦻8](images/18.svg)

block_hash `0x0000000000000000000...` = **0x19** 

## 1⦻9

![1⦻9](images/19.svg)

block_hash `0x00000000000000000000...` = **0x20** 

## 2⦻0

![2⦻0](images/20.svg)

block_hash `0x000000000000000000000...` = **0x21** 

## 2⦻1

![2⦻1](images/21.svg)

block_hash `0x0000000000000000000000...` = **0x22** 

## 2⦻2

![2⦻2](images/22.svg)

block_hash `0x00000000000000000000000...` = **0x23** 

## 2⦻3

![2⦻3](images/23.svg)

block_hash `0x000000000000000000000000...` = **0x24** 

## 2⦻4

![2⦻4](images/24.svg)

