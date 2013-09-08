<?php

namespace Challenge\ReportBundle\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * SalesOrderLine
 *
 * @ORM\Table(name="sales_order_line")
 * @ORM\Entity
 */
class SalesOrderLine
{
    /**
     * @var integer
     *
     * @ORM\Column(name="sales_order_line_id", type="integer", nullable=false)
     * @ORM\Id
     * @ORM\GeneratedValue(strategy="IDENTITY")
     */
    private $salesOrderLineId;

    /**
     * @var integer
     *
     * @ORM\Column(name="quantity", type="integer", nullable=false)
     */
    private $quantity;

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
     * @var float
     *
     * @ORM\Column(name="total_price", type="decimal", nullable=false)
     */
    private $totalPrice;
    
    /**
     * @var float
     *
     * @ORM\Column(name="total_cost", type="decimal", nullable=false)
     */
    private $totalCost;
    
    /**
     * @var float
     *
     * @ORM\Column(name="total_profit", type="decimal", nullable=false)
     */
    private $totalProfit;

    /**
     * @var \DateTime
     *
     * @ORM\Column(name="creation_date", type="datetime", nullable=false)
     */
    private $creationDate;

    /**
     * @var \Challenge\ReportBundle\Entity\SalesOrder
     *
     * @ORM\ManyToOne(targetEntity="Challenge\ReportBundle\Entity\SalesOrder")
     * @ORM\JoinColumns({
     *   @ORM\JoinColumn(name="sales_order_id", referencedColumnName="sales_order_id")
     * })
     */
    private $salesOrder;

    /**
     * @var \Challenge\ReportBundle\Entity\Product
     *
     * @ORM\ManyToOne(targetEntity="Challenge\ReportBundle\Entity\Product")
     * @ORM\JoinColumns({
     *   @ORM\JoinColumn(name="product_id", referencedColumnName="product_id")
     * })
     */
    private $product;



    /**
     * Get salesOrderLineId
     *
     * @return integer 
     */
    public function getSalesOrderLineId()
    {
        return $this->salesOrderLineId;
    }

    /**
     * Set quantity
     *
     * @param integer $quantity
     * @return SalesOrderLine
     */
    public function setQuantity($quantity)
    {
        $this->quantity = $quantity;
    
        return $this;
    }

    /**
     * Get quantity
     *
     * @return integer 
     */
    public function getQuantity()
    {
        return $this->quantity;
    }

    /**
     * Set unitPrice
     *
     * @param float $unitPrice
     * @return SalesOrderLine
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
     * Set totalPrice
     *
     * @param float $totalPrice
     * @return SalesOrderLine
     */
    public function setTotalPrice($totalPrice)
    {
        $this->totalPrice = $totalPrice;
    
        return $this;
    }

    /**
     * Get totalPrice
     *
     * @return float 
     */
    public function getTotalPrice()
    {
        return $this->totalPrice;
    }

    /**
     * Set creationDate
     *
     * @param \DateTime $creationDate
     * @return SalesOrderLine
     */
    public function setCreationDate($creationDate)
    {
        $this->creationDate = $creationDate;
    
        return $this;
    }

    /**
     * Get creationDate
     *
     * @return \DateTime 
     */
    public function getCreationDate()
    {
        return $this->creationDate;
    }

    /**
     * Set salesOrder
     *
     * @param \Challenge\ReportBundle\Entity\SalesOrder $salesOrder
     * @return SalesOrderLine
     */
    public function setSalesOrder(\Challenge\ReportBundle\Entity\SalesOrder $salesOrder = null)
    {
        $this->salesOrder = $salesOrder;
    
        return $this;
    }

    /**
     * Get salesOrder
     *
     * @return \Challenge\ReportBundle\Entity\SalesOrder 
     */
    public function getSalesOrder()
    {
        return $this->salesOrder;
    }

    /**
     * Set product
     *
     * @param \Challenge\ReportBundle\Entity\Product $product
     * @return SalesOrderLine
     */
    public function setProduct(\Challenge\ReportBundle\Entity\Product $product = null)
    {
        $this->product = $product;
    
        return $this;
    }

    /**
     * Get product
     *
     * @return \Challenge\ReportBundle\Entity\Product 
     */
    public function getProduct()
    {
        return $this->product;
    }

    /**
     * Set unitCost
     *
     * @param float $unitCost
     * @return SalesOrderLine
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

    /**
     * Set totalCost
     *
     * @param float $totalCost
     * @return SalesOrderLine
     */
    public function setTotalCost($totalCost)
    {
        $this->totalCost = $totalCost;
    
        return $this;
    }

    /**
     * Get totalCost
     *
     * @return float 
     */
    public function getTotalCost()
    {
        return $this->totalCost;
    }

    /**
     * Set totalProfit
     *
     * @param float $totalProfit
     * @return SalesOrderLine
     */
    public function setTotalProfit($totalProfit)
    {
        $this->totalProfit = $totalProfit;
    
        return $this;
    }

    /**
     * Get totalProfit
     *
     * @return float 
     */
    public function getTotalProfit()
    {
        return $this->totalProfit;
    }
}