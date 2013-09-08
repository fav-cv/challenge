<?php

namespace Challenge\ReportBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * Product
 *
 * @ORM\Table(name="product")
 * @ORM\Entity
 */
class Product
{
    /**
     * @var integer
     *
     * @ORM\Column(name="product_id", type="integer", nullable=false)
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="IDENTITY")
     */
    private $productId;

    /**
     * @var string
     *
     * @ORM\Column(name="product", type="string", length=255, nullable=false)
     */
    private $product;

    /**
     * @var float
     *
     * @ORM\Column(name="unit_price", type="decimal", nullable=false)
     */
    private $unitPrice;

    /**
     * @var float
     *
     * @ORM\Column(name="unit_cost", type="decimal", nullable=false)
     */
    private $unitCost;



    /**
     * Get productId
     *
     * @return integer 
     */
    public function getProductId()
    {
        return $this->productId;
    }

    /**
     * Set product
     *
     * @param string $product
     * @return Product
     */
    public function setProduct($product)
    {
        $this->product = $product;
    
        return $this;
    }

    /**
     * Get product
     *
     * @return string 
     */
    public function getProduct()
    {
        return $this->product;
    }

    /**
     * Set unitPrice
     *
     * @param float $unitPrice
     * @return Product
     */
    public function setUnitPrice($unitPrice)
    {
        $this->unitPrice = $unitPrice;
    
        return $this;
    }

    /**
     * Get unitPrice
     *
     * @return float 
     */
    public function getUnitPrice()
    {
        return $this->unitPrice;
    }


    /**
     * Set unitCost
     *
     * @param float $unitCost
     * @return Product
     */
    public function setUnitCost($unitCost)
    {
        $this->unitCost = $unitCost;
    
        return $this;
    }

    /**
     * Get unitCost
     *
     * @return float 
     */
    public function getUnitCost()
    {
        return $this->unitCost;
    }
}