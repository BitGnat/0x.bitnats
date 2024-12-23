WITH validity_query AS (
    SELECT 
        meta_name,
        claimed_block AS v_claimed_block,
        inscription_number AS v_inscription_number,
        inscription_id AS v_inscription_id,
        CASE 
            WHEN claimed_block > inscription_block THEN 'miss ⛔️' 
            WHEN inscription_number = min_inscription_number_over_claimed_block THEN 'Valid Bitnats Block ✅' 
            ELSE 'miss ⛔️' 
            END AS validity
    FROM (
        SELECT 
            content_decode AS meta_name,
            CAST(regexp_extract(content_decode, '([0-9]+)\\.bitnats$', 1) AS long) AS claimed_block,
            genesis_block_height AS inscription_block,
            number AS inscription_number,
            id AS inscription_id,
            MIN(number) OVER (PARTITION BY CAST(regexp_extract(content_decode, '([0-9]+)\\.bitnats$', 1) AS long)) AS min_inscription_number_over_claimed_block
        FROM
            ordinals.inscriptions_mints
        WHERE
            content_decode RLIKE '^[0-9]+\\.bitnats$' AND
            id RLIKE 'i0$'
    ) AS with_validity
)
SELECT 
    v_inscription_id AS inscription_id,
    meta_name,
    CONCAT('0x', LPAD(CAST(LENGTH(SUBSTRING(b.hash, 3)) - LENGTH(REGEXP_REPLACE(SUBSTRING(b.hash, 3), '^0+', '')) AS STRING), 2, '0')) AS meta_trait,
    CONCAT('https://github.com/BitGnat/bitnats/blob/main/images/0x', LPAD(CAST(LENGTH(SUBSTRING(b.hash, 3)) - LENGTH(REGEXP_REPLACE(SUBSTRING(b.hash, 3), '^0+', '')) AS STRING), 2, '0'), '.png') AS high_res_img_url
FROM 
    validity_query
JOIN 
    bitcoin.blocks b
ON 
    validity_query.v_claimed_block = b.number
WHERE
    validity = 'Valid Bitnats Block ✅'
ORDER BY
    v_claimed_block ASC
